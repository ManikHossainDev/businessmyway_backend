export const serializeDelivery = (delivery: any) => ({
    id: delivery._id ? String(delivery._id) : undefined,
    maximumPrice: Number(delivery.maximumPrice ?? 200),
    standardDelivery: {
        day: delivery.standardDelivery?.day || '3-5 Business Days',
        price: Number(delivery.standardDelivery?.price ?? 4.99),
    },
    expressDelivery: {
        day: delivery.expressDelivery?.day || '1-2 Business Days',
        price: Number(delivery.expressDelivery?.price ?? 9.99),
    },
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
});
