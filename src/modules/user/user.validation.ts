import { z } from 'zod';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

export const updateProfileBodySchema = z.object({
    name: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().optional(),
    countryCode: z.string().trim().optional(),
    avatar: z.string().trim().optional(),
    address: z.string().trim().optional(),
});

export const completeProfileBodySchema = z.object({
    avatar: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    countryCode: z.string().trim().min(1, 'Country code is required'),
    address: z.string().trim().min(1, 'Address is required'),
});

export const listUsersQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sort: z.string().optional(),
    search: z.string().optional(),
    role: z.string().optional(),
    status: z.string().optional(),
    onboardingStep: z.string().optional(),
    isOnboardingCompleted: z.coerce.boolean().optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type CompleteProfileBody = z.infer<typeof completeProfileBodySchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;