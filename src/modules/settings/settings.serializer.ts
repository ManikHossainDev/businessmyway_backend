import type { ISettingDocument, SettingSlug } from './settings.interface';

const DEFAULT_TITLES: Record<SettingSlug, string> = {
    privacy_policy: 'Privacy Policy',
    terms_and_conditions: 'Terms and Conditions',
    about_us: 'About Us',
    refund_policy: 'Refund Policy',
    shipping_policy: 'Shipping Policy',
};

export const defaultSettingTitle = (slug: SettingSlug): string => DEFAULT_TITLES[slug] || slug;

export const serializeSetting = (setting: ISettingDocument | null) => {
    if (!setting) return null;

    return {
        slug: setting.slug,
        title: setting.title,
        content: setting.content || '',
        metadata: setting.metadata ?? null,
        updatedAt: setting.updatedAt,
    };
};
