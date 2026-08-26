import { z } from 'zod';

const objectId = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Valid category id is required');

export const createBrandBodySchema = z.object({
    category: objectId,
    title: z.string().trim().min(2, 'Title is required').max(120),
    description: z.string().trim().min(2, 'Description is required').max(2000),
    subtitles: z
        .array(z.string().trim().min(1).max(80))
        .min(1, 'Add at least one subtitle'),
});

export const brandIdParamSchema = z.object({
    id: z.string().trim().min(1, 'Brand id is required'),
});

export const listBrandsQuerySchema = z.object({
    category: z.string().trim().min(1).max(80).optional(),
    brand: z.string().trim().min(1).max(120).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type CreateBrandBody = z.infer<typeof createBrandBodySchema>;
