import { z } from 'zod';

export const createSubscriberBodySchema = z.object({
    email: z.string().trim().toLowerCase().email('Valid email is required').max(120),
    agreed: z.boolean().refine((value) => value === true, {
        message: 'You must accept the privacy policy to subscribe.',
    }),
});

export const subscriberIdParamSchema = z.object({
    id: z.string().trim().min(1, 'Subscriber id is required'),
});

export const sendSubscriberEmailBodySchema = z.object({
    subject: z.string().trim().min(2, 'Subject is required').max(160),
    message: z.string().trim().min(2, 'Message is required').max(5000),
});

export type CreateSubscriberBody = z.infer<typeof createSubscriberBodySchema>;
