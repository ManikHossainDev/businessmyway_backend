import { z } from 'zod';

export const updateDeliveryBodySchema = z.object({
    maximumPrice: z.number().min(0, 'Maximum Price must be greater than or equal to 0'),
    standardDelivery: z.object({
        day: z.string().trim().min(1, 'Standard delivery day is required'),
        price: z.number().min(0, 'Standard delivery price must be 0 or more'),
    }),
    expressDelivery: z.object({
        day: z.string().trim().min(1, 'Express delivery day is required'),
        price: z.number().min(0, 'Express delivery price must be 0 or more'),
    }),
});
