import { config } from '@/config';
import { cartService } from '@/modules/cart/cart.service';
import { ProductModel } from '@/modules/products/product.model';
import { vivaService } from '@/infrastructure/viva/viva.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/core/errors';
import { MESSAGES } from '@/core/constants/messages';
import { OrderModel } from './order.model';
import { ORDER_STATUS, DELIVERY_TYPES, type DeliveryType, type IOrderDocument } from './order.interface';
import type { CheckoutBody, ConfirmOrderBody } from './order.validation';
import { deliveryService } from '@/modules/delivery/delivery.service';
import { notificationService } from '@/modules/notification/notification.service';
import { NOTIFICATION_TYPES } from '@/modules/notification/notification.constants';
import { logger } from '@/infrastructure/logger/winston.logger';

const generateOrderNumber = () => {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `BMW-${stamp}${rand}`;
};


export class OrderService {
    async list(userId: string) {
        return OrderModel.find({ user: userId }).sort({ createdAt: -1 });
    }

    async listAll() {
        return OrderModel.find().sort({ createdAt: -1 });
    }

    async getById(userId: string, orderId: string) {
        const order = await OrderModel.findById(orderId);
        if (!order) {
            throw new NotFoundError(MESSAGES.ORDER.NOT_FOUND, 'ORDER_NOT_FOUND');
        }
        if (String(order.user) !== userId) {
            throw new ForbiddenError(MESSAGES.ORDER.NOT_FOUND, 'ORDER_FORBIDDEN');
        }
        return order;
    }

    async checkout(userId: string, body: CheckoutBody) {
        const cartItems = await cartService.list(userId);
        if (!cartItems.length) {
            throw new BadRequestError(MESSAGES.ORDER.EMPTY_CART, 'CART_EMPTY');
        }

        for (const item of cartItems) {
            if (item.qty > item.product.stockQty) {
                throw new BadRequestError(MESSAGES.CART.OUT_OF_STOCK, 'CART_OUT_OF_STOCK');
            }
        }

        const items = cartItems.map((item) => {
            const product = item.product as typeof item.product & { _id?: unknown };
            return {
                product: product._id || product.id,
                name: product.name,
                image: product.image || product.images?.[0] || '',
                price: product.price,
                qty: item.qty,
            };
        });
        const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);

        const deliveryConfig = await deliveryService.getDelivery();
        const maximumPrice = Number(deliveryConfig?.maximumPrice ?? 200);
        const requestedType = body.deliveryType || DELIVERY_TYPES.STANDARD;

        let deliveryFee = 0;
        let deliveryType: DeliveryType = requestedType;
        let deliveryLabel = 'Standard Delivery';

        if (subtotal >= maximumPrice) {
            // If subtotal is greater than or equal to maximumPrice, delivery is FREE
            deliveryFee = 0;
            deliveryType = requestedType === DELIVERY_TYPES.EXPRESS ? DELIVERY_TYPES.EXPRESS : DELIVERY_TYPES.STANDARD;
            deliveryLabel = requestedType === DELIVERY_TYPES.EXPRESS ? 'Express Delivery (Free)' : 'Standard Delivery (Free)';
        } else {
            if (requestedType === DELIVERY_TYPES.EXPRESS) {
                deliveryFee = Number(deliveryConfig?.expressDelivery?.price ?? 9.99);
                deliveryType = DELIVERY_TYPES.EXPRESS;
                deliveryLabel = `Express Delivery (${deliveryConfig?.expressDelivery?.day || '1-2 Business Days'})`;
            } else {
                deliveryFee = Number(deliveryConfig?.standardDelivery?.price ?? 4.99);
                deliveryType = DELIVERY_TYPES.STANDARD;
                deliveryLabel = `Standard Delivery (${deliveryConfig?.standardDelivery?.day || '3-5 Business Days'})`;
            }
        }

        const total = subtotal + deliveryFee;

        const order = await OrderModel.create({
            user: userId,
            orderNumber: generateOrderNumber(),
            items,
            subtotal,
            deliveryFee,
            total,
            deliveryType,
            status: ORDER_STATUS.PENDING,
            customer: {
                name: body.name,
                phone: body.phone,
                email: body.email,
                location: body.location,
            },
        });

        try {
            const vivaOrder = await vivaService.createOrder({
                orderNumber: order.orderNumber,
                amount: total,
                customerEmail: body.email,
                customerName: body.name,
                customerPhone: body.phone,
                customerTrns: `Order #${order.orderNumber}`,
            });

            order.vivaOrderCode = vivaOrder.orderCode;
            await order.save();
            await this.notifyAdminsOfNewOrder(order);
            await cartService.clear(userId);

            return {
                url: vivaOrder.checkoutUrl,
                orderId: order.id,
                orderNumber: order.orderNumber,
                orderCode: vivaOrder.orderCode,
            };
        } catch (error) {
            await OrderModel.findByIdAndDelete(order.id);
            if (error instanceof BadRequestError) {
                throw error;
            }
            logger.error('Failed to create Viva checkout order', {
                error: error instanceof Error ? error.message : error,
            });
            throw new BadRequestError(
                'Unable to start payment with Viva Payments. Please check configuration and try again.',
                'VIVA_CHECKOUT_FAILED',
            );
        }
    }

    async confirm(userId: string, orderId?: string, params?: ConfirmOrderBody) {
        let order: IOrderDocument | null = null;

        if (orderId && orderId !== 'lookup' && orderId !== 'null' && orderId !== 'undefined') {
            order = await OrderModel.findById(orderId);
        }

        if (!order && params?.orderCode) {
            order = await OrderModel.findOne({ vivaOrderCode: String(params.orderCode) });
        }

        if (!order && params?.transactionId) {
            order = await OrderModel.findOne({ vivaTransactionId: String(params.transactionId) });
        }

        if (!order) {
            throw new NotFoundError(MESSAGES.ORDER.NOT_FOUND, 'ORDER_NOT_FOUND');
        }

        if (String(order.user) !== userId) {
            throw new ForbiddenError(MESSAGES.ORDER.NOT_FOUND, 'ORDER_FORBIDDEN');
        }

        if (order.status === ORDER_STATUS.PAID) {
            await cartService.clear(userId);
            return order;
        }

        // 1. Verify Viva Payments transaction if transactionId is provided
        if (params?.transactionId) {
            try {
                const tx = await vivaService.retrieveTransaction(params.transactionId);
                // statusId 'F' indicates finalized/successful payment in Viva
                if (tx.statusId === 'F') {
                    return this.markPaidWithViva(order, params.transactionId);
                }
                throw new BadRequestError(
                    `Viva payment is not finalized yet (status: ${tx.statusId || 'pending'}).`,
                    'ORDER_PAYMENT_PENDING',
                );
            } catch (err) {
                if (err instanceof BadRequestError) throw err;
                logger.error('Failed to verify Viva transaction', {
                    orderId: order.id,
                    transactionId: params.transactionId,
                    error: err instanceof Error ? err.message : err,
                });
                throw new BadRequestError(MESSAGES.ORDER.PAYMENT_PENDING, 'ORDER_PAYMENT_PENDING');
            }
        }

        // 3. Fallback: Order code matched directly on redirect
        if (params?.orderCode && String(order.vivaOrderCode) === String(params.orderCode)) {
            return this.markPaidWithViva(order);
        }

        throw new BadRequestError(MESSAGES.ORDER.PAYMENT_PENDING, 'ORDER_PAYMENT_PENDING');
    }

    async fulfillFromVivaWebhook(eventData: Record<string, any>) {
        const orderCode = String(eventData.OrderCode || eventData.orderCode || '');
        const transactionId = String(eventData.TransactionId || eventData.transactionId || '');
        const statusId = String(eventData.StatusId || eventData.statusId || '');

        logger.info('Received Viva Webhook event', { orderCode, transactionId, statusId });

        if (!orderCode) {
            return null;
        }

        const order = await OrderModel.findOne({ vivaOrderCode: orderCode });
        if (!order || order.status === ORDER_STATUS.PAID) {
            return order;
        }

        if (statusId === 'F' || !statusId) {
            return this.markPaidWithViva(order, transactionId);
        }

        return order;
    }

    private async decrementStock(order: IOrderDocument) {
        for (const item of order.items) {
            await ProductModel.updateOne({ _id: item.product }, { $inc: { stockQty: -item.qty } });
        }
    }

    private async markPaidWithViva(order: IOrderDocument, transactionId?: string) {
        if (order.status === ORDER_STATUS.PAID) {
            return order;
        }

        await this.decrementStock(order);

        order.status = ORDER_STATUS.PAID;
        order.paidAt = new Date();
        if (transactionId) {
            order.vivaTransactionId = transactionId;
        }
        await order.save();
        await cartService.clear(String(order.user));
        return order;
    }

    private async notifyAdminsOfNewOrder(order: IOrderDocument) {
        const deliveryLabel =
            order.deliveryFee === 0
                ? 'Free Delivery'
                : order.deliveryType === DELIVERY_TYPES.EXPRESS
                ? 'Express Delivery'
                : 'Standard Delivery';
        const paymentLabel = order.status === ORDER_STATUS.PAID ? 'Paid' : 'Unpaid';
        try {
            await notificationService.notifyAdmins({
                title: 'New order received',
                message: `${order.customer.name} placed order #${order.orderNumber} (£${(order.total ?? order.subtotal).toFixed(2)}, ${deliveryLabel}, ${paymentLabel}).`,
                type: NOTIFICATION_TYPES.ADMIN_NEW_ORDER,
                metadata: {
                    orderId: String(order.id || order._id),
                    orderNumber: order.orderNumber,
                    amount: order.total ?? order.subtotal,
                    status: order.status,
                    deliveryType: order.deliveryType,
                },
            });
        } catch (error) {
            logger.error('Failed to notify admins about new order', {
                orderId: String(order.id || order._id),
                error: error instanceof Error ? error.message : error,
            });
        }
    }
}

export const orderService = new OrderService();
