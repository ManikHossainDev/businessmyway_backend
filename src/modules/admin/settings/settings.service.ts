import { settingsService } from '@/modules/settings/settings.service';
import type { SettingSlug, ISettingDocument } from '@/modules/settings/settings.interface';

export class AdminSettingsService {
    async list(): Promise<ISettingDocument[]> {
        return settingsService.listAll();
    }

    async getBySlug(slug: SettingSlug): Promise<ISettingDocument | null> {
        return settingsService.getBySlug(slug);
    }

    async upsert(slug: SettingSlug, data: { title?: string; content?: string; metadata?: Record<string, unknown> }): Promise<ISettingDocument> {
        return settingsService.upsert(slug, data);
    }

    async listContacts() {
        return settingsService.listContacts();
    }
}

export const adminSettingsService = new AdminSettingsService();
