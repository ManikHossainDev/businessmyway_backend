import { z } from 'zod';

const objectId = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Valid product id is required');

export const addCartBodySchema = z.object({
    productId: objectId,
    qty: z.coerce.number().int().min(1).optional().default(1),
});

export const updateCartBodySchema = z.object({
    qty: z.coerce.number().int().min(0),
});

export const cartProductParamSchema = z.object({
    productId: objectId,
});

export type AddCartBody = z.infer<typeof addCartBodySchema>;
export type UpdateCartBody = z.infer<typeof updateCartBodySchema>;
