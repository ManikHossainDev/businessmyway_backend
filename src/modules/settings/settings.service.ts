import type { SettingSlug, ISettingDocument } from './settings.interface';
import { SettingModel } from './settings.model';
import { ContactModel } from './contact.model';
import { mailService } from '@/infrastructure/mail/mail.service';
import { config } from '@/config';

const extractEmail = (fromField: string | undefined): string | undefined => {
    if (!fromField) return undefined;
    const match = fromField.match(/<([^>]+)>/);
    return match ? match[1] : fromField;
};

export class SettingsService {
    async getBySlug(slug: SettingSlug): Promise<ISettingDocument | null> {
        const setting = await SettingModel.findOne({ slug }).lean<ISettingDocument>();
        return setting;
    }

    async submitContact(input: { name: string; email: string; subject: string; message: string }): Promise<void> {
        await ContactModel.create(input);

        const ownerEmail = extractEmail(config.mail.from);

        await mailService.send({
            to: input.email,
            subject: `Thank you for contacting ${config.app.name}`,
            template: 'contact-acknowledgment',
            context: {
                name: input.name,
                subject: input.subject,
                message: input.message,
            },
        });

        if (ownerEmail) {
            await mailService.send({
                to: ownerEmail,
                subject: `New Contact Form Submission from ${input.name}`,
                template: 'contact-notification',
                context: {
                    name: input.name,
                    email: input.email,
                    subject: input.subject,
                    message: input.message,
                },
            });
        }
    }

    async getPublicBySlug(slug: SettingSlug): Promise<ISettingDocument | null> {
        const setting = await SettingModel.findOne({ slug, isPublic: true }).lean<ISettingDocument>();
        return setting;
    }

    async upsert(slug: SettingSlug, data: { title?: string; content?: string; metadata?: Record<string, unknown> }): Promise<ISettingDocument> {
        const fields: Record<string, unknown> = {};
        if (data.title !== undefined) fields['title'] = data.title;
        if (data.content !== undefined) fields['content'] = data.content;
        if (data.metadata !== undefined) fields['metadata'] = data.metadata;

        const setting = await SettingModel.findOneAndUpdate(
            { slug },
            { $set: fields },
            { new: true, upsert: true, runValidators: false },
        ).lean<ISettingDocument>();
        return setting!;
    }

    async listAll(): Promise<ISettingDocument[]> {
        return SettingModel.find().lean<ISettingDocument[]>();
    }

    async listContacts() {
        return ContactModel.find().sort({ createdAt: -1 }).lean();
    }
}

export const settingsService = new SettingsService();
