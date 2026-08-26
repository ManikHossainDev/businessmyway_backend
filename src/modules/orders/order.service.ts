import type Stripe from 'stripe';
import { config } from '@/config';
import { cartService } from '@/modules/cart/cart.service';
import { ProductModel } from '@/modules/products/product.model';
import { stripeService } from '@/infrastructure/stripe/stripe.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/core/errors';
import { MESSAGES } from '@/core/constants/messages';
import { OrderModel } from './order.model';
import { ORDER_STATUS, DELIVERY_TYPES, IN_DELIVERY_FEE, PAID_DELIVERY_FEE, type IOrderDocument } from './order.interface';
import type { CheckoutBody } from './order.validation';
import { notificationService } from '@/modules/notification/notification.service';
import { NOTIFICATION_TYPES } from '@/modules/notification/notification.constants';
import { logger } from '@/infrastructure/logger/winston.logger';

const generateOrderNumber = () => {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `BMW-${stamp}${rand}`;
};

const isPaidSession = (session: Stripe.Checkout.Session) =>
    session.payment_status === 'paid' || session.status === 'complete';

const paymentIntentId = (session: Stripe.Checkout.Session) =>
    typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

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
        const deliveryType = body.deliveryType;
        const deliveryFee =
            deliveryType === DELIVERY_TYPES.PAID_DELIVERY ? PAID_DELIVERY_FEE : IN_DELIVERY_FEE;
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

        if (deliveryType === DELIVERY_TYPES.IN_DELIVERY) {
            await this.decrementStock(order);
            await cartService.clear(userId);
            await this.notifyAdminsOfNewOrder(order);
            return {
                url: null,
                direct: true,
                orderId: order.id,
                orderNumber: order.orderNumber,
            };
        }

        const origin = (body.origin || config.app.clientUrl).replace(/\/$/, '');

        try {
            const session = await stripeService.createOrderCheckoutSession({
                userId,
                orderId: order.id,
                customerEmail: body.email,
                lineItems: [
                    ...items.map((item) => ({
                        name: item.name,
                        unitAmount: item.price,
                        quantity: item.qty,
                    })),
                    ...(deliveryFee > 0
                        ? [
                              {
                                  name:
                                      deliveryType === DELIVERY_TYPES.PAID_DELIVERY
                                          ? 'Paid Delivery'
                                          : 'Case In Delivery',
                                  unitAmount: deliveryFee,
                                  quantity: 1,
                              },
                          ]
                        : []),
                ],
                successUrl: `${origin}/order-success?orderId=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${origin}/?checkout=cancelled`,
            });

            if (!session.url) {
                throw new BadRequestError(MESSAGES.STRIPE.PAYMENT_FAILED, 'STRIPE_SESSION_URL_MISSING');
            }

            order.stripeSessionId = session.id;
            await order.save();
            await this.notifyAdminsOfNewOrder(order);
            await cartService.clear(userId);

            return { url: session.url, orderId: order.id, orderNumber: order.orderNumber };
        } catch (error) {
            await OrderModel.findByIdAndDelete(order.id);
            if (error instanceof BadRequestError) {
                throw error;
            }
            throw new BadRequestError(
                'Unable to start payment. Please try again.',
                'STRIPE_CHECKOUT_FAILED',
            );
        }
    }

    async confirm(userId: string, orderId: string, sessionId: string) {
        const order = await this.getById(userId, orderId);
        if (order.status === ORDER_STATUS.PAID) {
            await cartService.clear(userId);
            return order;
        }

        const session = await stripeService.retrieveCheckoutSession(sessionId);
        if (String(session.metadata?.orderId) !== String(order.id)) {
            throw new BadRequestError(MESSAGES.ORDER.PAYMENT_PENDING, 'ORDER_SESSION_MISMATCH');
        }
        if (!isPaidSession(session)) {
            throw new BadRequestError(MESSAGES.ORDER.PAYMENT_PENDING, 'ORDER_PAYMENT_PENDING');
        }

        return this.markPaid(order, session);
    }

    async fulfillFromWebhook(session: Stripe.Checkout.Session) {
        const orderId = session.metadata?.orderId;
        if (!orderId) {
            return;
        }

        const order = await OrderModel.findById(orderId);
        if (!order || order.status === ORDER_STATUS.PAID) {
            return order;
        }
        if (!isPaidSession(session)) {
            return order;
        }

        return this.markPaid(order, session);
    }

    private async decrementStock(order: IOrderDocument) {
        for (const item of order.items) {
            await ProductModel.updateOne({ _id: item.product }, { $inc: { stockQty: -item.qty } });
        }
    }

    private async markPaid(order: IOrderDocument, session: Stripe.Checkout.Session) {
        if (order.status === ORDER_STATUS.PAID) {
            return order;
        }

        await this.decrementStock(order);

        order.status = ORDER_STATUS.PAID;
        order.paidAt = new Date();
        order.stripeSessionId = session.id || order.stripeSessionId;
        order.stripePaymentIntentId = paymentIntentId(session) || order.stripePaymentIntentId;
        await order.save();
        await cartService.clear(String(order.user));
        return order;
    }

    private async notifyAdminsOfNewOrder(order: IOrderDocument) {
        const deliveryLabel =
            order.deliveryType === DELIVERY_TYPES.PAID_DELIVERY ? 'Paid Delivery' : 'Case In Delivery';
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
