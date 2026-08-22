import type { Document } from 'mongoose';

export type SettingSlug = 'privacy_policy' | 'terms_and_conditions' | 'about_us';

export interface IAppInfoMetadata {
    emails?: string;
    phones?: string;
    address?: string;
    [key: string]: unknown;
}

export interface ISetting {
    slug: SettingSlug;
    title: string;
    content: string;
    isPublic: boolean;
    metadata?: IAppInfoMetadata | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ISettingDocument extends ISetting, Document {
    id: string;
}
