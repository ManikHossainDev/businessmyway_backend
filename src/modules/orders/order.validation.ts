import { z } from 'zod';

import { DELIVERY_TYPES } from './order.interface';

const objectId = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Valid order id is required');

export const checkoutBodySchema = z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(6).max(24),
    email: z.string().trim().email().max(120),
    location: z.string().trim().min(5).max(400),
    deliveryType: z.enum([DELIVERY_TYPES.PAID_DELIVERY]).optional().default(DELIVERY_TYPES.PAID_DELIVERY),
    origin: z.string().trim().url().max(200).optional(),
});

export const confirmOrderBodySchema = z.object({
    sessionId: z.string().trim().min(8).max(200),
});

export const orderIdParamSchema = z.object({
    id: objectId,
});

export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
export type ConfirmOrderBody = z.infer<typeof confirmOrderBodySchema>;
