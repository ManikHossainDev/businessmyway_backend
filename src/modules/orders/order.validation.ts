import { z } from 'zod';

import { DELIVERY_TYPES, ORDER_STATUS } from './order.interface';

const objectId = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Valid order id is required');

export const checkoutBodySchema = z.object({
    name: z.string().trim().min(2).max(80).optional().or(z.literal('')),
    phone: z.string().trim().min(6).max(24),
    email: z.string().trim().email().max(120).optional().or(z.literal('')),
    location: z.string().trim().min(5).max(400).optional().or(z.literal('')),
    deliveryType: z
        .enum([
            DELIVERY_TYPES.STANDARD,
            DELIVERY_TYPES.EXPRESS,
            DELIVERY_TYPES.FREE_DELIVERY,
            DELIVERY_TYPES.PAID_DELIVERY,
        ])
        .optional()
        .default(DELIVERY_TYPES.STANDARD),
    origin: z.string().trim().url().max(200).optional(),
});

export const confirmOrderBodySchema = z
    .object({
        sessionId: z.string().trim().min(1).max(200).optional(),
        orderCode: z.string().trim().min(1).max(100).optional(),
        transactionId: z.string().trim().min(1).max(200).optional(),
    })
    .refine((data) => data.sessionId || data.orderCode || data.transactionId, {
        message: 'Either sessionId, orderCode, or transactionId is required to confirm an order.',
    });

export const confirmOrderIdParamSchema = z.object({
    id: z.string().trim().min(1).max(50),
});

export const orderIdParamSchema = z.object({
    id: objectId,
});

export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
export type ConfirmOrderBody = z.infer<typeof confirmOrderBodySchema>;

export const updateOrderStatusBodySchema = z.object({
    status: z.enum([
        ORDER_STATUS.PENDING,
        ORDER_STATUS.PAID,
        ORDER_STATUS.PROCESSING,
        ORDER_STATUS.ON_THE_WAY,
        ORDER_STATUS.DELIVERED,
        ORDER_STATUS.CANCELLED,
    ]),
    shippingInfo: z.object({
        company: z.string().trim().min(1).max(100),
        trackingId: z.string().trim().min(1).max(100),
        shippingDate: z.string().pipe(z.coerce.date()),
        estimatedDeliveryDate: z.string().pipe(z.coerce.date()),
    }).optional(),
}).refine(
    (data) => {
        if (data.status === ORDER_STATUS.ON_THE_WAY && !data.shippingInfo) {
            return false;
        }
        return true;
    },
    { message: 'Shipping info is required when order is on the way.' }
);

export type UpdateOrderStatusBody = z.infer<typeof updateOrderStatusBodySchema>;
