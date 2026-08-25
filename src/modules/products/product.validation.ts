import { z } from 'zod';
import { PRODUCT_ATTRIBUTE_KEYS } from './product.attributes';

const objectId = z.string().trim().regex(/^[a-fA-F0-9]{24}$/, 'Valid id is required');

const commaList = z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
        if (!value) return undefined;
        const items = Array.isArray(value) ? value : value.split(',');
        const cleaned = items.map((item) => item.trim()).filter(Boolean);
        return cleaned.length ? cleaned : undefined;
    });

export const productIdParamSchema = z.object({
    id: z.string().trim().min(1, 'Product id is required'),
});

export const createProductBodySchema = z.object({
    name: z.string().trim().min(2, 'Product name is required').max(160),
    sku: z.string().trim().min(1, 'SKU is required').max(60),
    category: objectId,
    brand: objectId,
    price: z.coerce.number().min(0, 'Price must be 0 or more'),
    stockQty: z.coerce.number().int().min(0, 'Stock must be 0 or more'),
    description: z.string().trim().max(4000).optional().default(''),
    image: z.string().trim().optional().default(''),
    isActive: z.coerce.boolean().optional().default(true),
    isFeatured: z.coerce.boolean().optional().default(false),
    attributes: z.record(z.string(), z.string()).optional().default({}),
});

export const updateProductBodySchema = createProductBodySchema.extend({
    image: z.string().trim().optional(),
});

export const listProductsQuerySchema = z.object({
    category: z.string().trim().min(1).max(80).optional(),
    brand: commaList,
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sort: z.enum(['newest', 'priceAsc', 'priceDesc', 'bestSelling']).optional(),
    search: z.string().trim().min(1).max(80).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    featured: z
        .enum(['true', 'false'])
        .optional()
        .transform((value) => (value === undefined ? undefined : value === 'true')),
    active: z
        .enum(['true', 'false'])
        .optional()
        .transform((value) => (value === undefined ? undefined : value === 'true')),
    ...Object.fromEntries(PRODUCT_ATTRIBUTE_KEYS.map((key) => [key, commaList])),
});

export type CreateProductBody = z.infer<typeof createProductBodySchema>;
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;
