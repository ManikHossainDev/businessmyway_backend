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

export const savedAddressBodySchema = z.object({
    firstName: z.string().trim().min(1).max(40),
    lastName: z.string().trim().min(1).max(40),
    company: z.string().trim().max(80).optional(),
    address1: z.string().trim().min(1).max(120),
    address2: z.string().trim().max(120).optional(),
    city: z.string().trim().min(1).max(80),
    country: z.string().trim().min(1).max(80),
    province: z.string().trim().max(80).optional(),
    postcode: z.string().trim().max(20).optional().default(''),
    phone: z.string().trim().min(1).max(20),
    isDefault: z.coerce.boolean().optional().default(false),
});

export const savedAddressIdParamSchema = z.object({
    id: z.string().trim().min(1, 'Address id is required'),
});

export const userIdParamSchema = z.object({
    id: z.string().trim().min(1, 'User id is required'),
});

export const listUsersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sort: z.string().optional(),
    search: z.string().trim().optional(),
    role: z.string().optional(),
    status: z.string().optional(),
    onboardingStep: z.string().optional(),
    isOnboardingCompleted: z.coerce.boolean().optional(),
});

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type CompleteProfileBody = z.infer<typeof completeProfileBodySchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type SavedAddressBody = z.infer<typeof savedAddressBodySchema>;