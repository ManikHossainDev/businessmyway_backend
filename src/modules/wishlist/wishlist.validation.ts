import { z } from 'zod';

const objectId = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Valid product id is required');

export const addWishlistBodySchema = z.object({
    productId: objectId,
});

export const wishlistProductParamSchema = z.object({
    productId: objectId,
});

export type AddWishlistBody = z.infer<typeof addWishlistBodySchema>;
