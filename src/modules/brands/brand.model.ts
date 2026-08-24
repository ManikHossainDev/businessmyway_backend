import mongoose, { Schema } from 'mongoose';
import type { IBrandDocument } from './brand.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';

const brandSchema = new Schema<IBrandDocument>(
    {
        category: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category is required'],
            index: true,
        },
        title: {
            type: String,
            required: [true, 'Brand title is required'],
            trim: true,
            minlength: 2,
            maxlength: 120,
        },
        description: {
            type: String,
            required: [true, 'Brand description is required'],
            trim: true,
            maxlength: 2000,
        },
        subtitles: {
            type: [String],
            default: [],
            validate: {
                validator: (items: string[]) => items.length > 0,
                message: 'At least one subtitle is required',
            },
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
        collection: 'brands',
    },
);

brandSchema.plugin(toJSONPlugin);

export const BrandModel = mongoose.model<IBrandDocument>('Brand', brandSchema);
