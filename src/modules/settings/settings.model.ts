import mongoose, { Schema } from 'mongoose';
import { SETTING_SLUGS, type ISettingDocument } from './settings.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';

const settingSchema = new Schema<ISettingDocument>(
    {
        slug: {
            type: String,
            enum: SETTING_SLUGS,
            required: [true, 'Slug is required'],
            unique: true,
            index: true,
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: 200,
        },
        content: {
            type: String,
            default: '',
        },
        isPublic: {
            type: Boolean,
            default: true,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
        collection: 'settings',
    },
);

settingSchema.plugin(toJSONPlugin);

export const SettingModel = mongoose.model<ISettingDocument>('Setting', settingSchema);
