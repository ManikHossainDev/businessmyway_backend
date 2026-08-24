import { z } from 'zod';

export const createCategoryBodySchema = z.object({
    name: z.string().trim().min(2, 'Category name is required').max(80),
});

export const categoryIdParamSchema = z.object({
    id: z.string().trim().min(1, 'Category id is required'),
});

export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;
