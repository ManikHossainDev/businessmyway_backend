import { z } from 'zod';

export const createReviewBodySchema = z.object({
    name: z.string().trim().min(2, 'Name is required').max(80),
    text: z.string().trim().min(10, 'Review must be at least 10 characters').max(800),
    rating: z.coerce.number().int().min(1).max(5).default(5),
    tag: z.string().trim().max(40).optional(),
    productId: z.string().trim().min(1, 'Product id is required').optional(),
});

export const reviewIdParamSchema = z.object({
    id: z.string().trim().min(1, 'Review id is required'),
});

export const productIdParamSchema = z.object({
    productId: z.string().trim().min(1, 'Product id is required'),
});

export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;
