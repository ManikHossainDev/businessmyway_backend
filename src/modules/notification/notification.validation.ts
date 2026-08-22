import { z } from 'zod';

import { NOTIFICATION_TYPES } from './notification.constants';

const objectIdRegex = /^[a-f\d]{24}$/i;

const notificationTypeValues = [
    NOTIFICATION_TYPES.INFO,
    NOTIFICATION_TYPES.CLAIM_APPROVED,
    NOTIFICATION_TYPES.CLAIM_REJECTED,
    NOTIFICATION_TYPES.CLAIM_SUBMITTED,
    NOTIFICATION_TYPES.PAYMENT_SUCCESSFUL,
    NOTIFICATION_TYPES.RENEWAL_REMINDER,
    NOTIFICATION_TYPES.PROFILE_APPROVED,
    NOTIFICATION_TYPES.PROFILE_REJECTED,
    NOTIFICATION_TYPES.ADMIN_NEW_USER,
    NOTIFICATION_TYPES.ADMIN_NEW_CLAIM,
] as const;

export const createNotificationBodySchema = z.object({
    userId: z.string().regex(objectIdRegex, 'Invalid user id.'),
    title: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(1000),
    type: z.enum(notificationTypeValues).optional(),
    adminMessage: z.string().trim().max(500).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export const notificationIdParamSchema = z.object({
    id: z.string().regex(objectIdRegex, 'Invalid notification id.'),
});

export const listNotificationsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sort: z.string().optional(),
    isRead: z
        .string()
        .optional()
        .transform((value) => {
            if (value === 'true') {
                return true;
            }
            if (value === 'false') {
                return false;
            }
            return undefined;
        }),
});

export const testPushNotificationBodySchema = z.object({
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(500),
});

export const broadcastNotificationBodySchema = z.object({
    title: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(1000),
    type: z.enum(notificationTypeValues).optional().default(NOTIFICATION_TYPES.INFO),
    adminMessage: z.string().trim().max(500).optional().default("Admin Message"),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
