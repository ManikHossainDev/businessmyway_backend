import type { IOrderDocument } from './order.interface';

export const serializeOrder = (order: IOrderDocument) => ({
    id: order.id || String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    deliveryType: order.deliveryType || 'paid_delivery',
    deliveryFee: order.deliveryFee ?? 0,
    subtotal: order.subtotal,
    total: order.total ?? order.subtotal,
    items: order.items.map((item) => ({
        product: String(item.product),
        name: item.name,
        image: item.image,
        price: item.price,
        qty: item.qty,
    })),
    customer: order.customer,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
});
