import mongoose, { Schema } from 'mongoose';
import type { ICategoryDocument } from './category.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';

const categorySchema = new Schema<ICategoryDocument>(
    {
        name: {
            type: String,
            required: [true, 'Category name is required'],
            trim: true,
            minlength: 2,
            maxlength: 80,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
        collection: 'categories',
    },
);

categorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
categorySchema.plugin(toJSONPlugin);

export const CategoryModel = mongoose.model<ICategoryDocument>('Category', categorySchema);
