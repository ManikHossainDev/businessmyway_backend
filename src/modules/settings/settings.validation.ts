import { z } from 'zod';
import { SETTING_SLUGS } from './settings.interface';

export const settingSlugParamSchema = z.object({
    slug: z.enum(SETTING_SLUGS),
});

export const updateSettingBodySchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().max(500000).optional(),
    metadata: z.object({
        emails: z.string().trim().optional(),
        phones: z.string().trim().optional(),
        address: z.string().trim().optional(),
    }).catchall(z.unknown()).optional(),
}).refine(
    data => data.title !== undefined || data.content !== undefined || data.metadata !== undefined,
    { message: 'At least one of title, content, or metadata is required.' },
);

export const contactFormBodySchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    email: z.string().trim().toLowerCase().email('Valid email is required'),
    subject: z.string().trim().min(1, 'Subject is required').max(200),
    message: z.string().trim().min(1, 'Message is required').max(2000),
});

export type UpdateSettingBody = z.infer<typeof updateSettingBodySchema>;
export type ContactFormBody = z.infer<typeof contactFormBodySchema>;
