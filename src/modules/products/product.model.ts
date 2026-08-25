import mongoose, { Schema } from 'mongoose';
import type { IProductDocument } from './product.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';

const productSchema = new Schema<IProductDocument>(
    {
        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
            minlength: 2,
            maxlength: 160,
        },
        slug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        sku: {
            type: String,
            required: [true, 'SKU is required'],
            trim: true,
            maxlength: 60,
        },
        category: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category is required'],
            index: true,
        },
        brand: {
            type: Schema.Types.ObjectId,
            ref: 'Brand',
            required: [true, 'Brand is required'],
            index: true,
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: 0,
            index: true,
        },
        stockQty: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        description: {
            type: String,
            trim: true,
            default: '',
            maxlength: 4000,
        },
        image: {
            type: String,
            trim: true,
            default: '',
        },
        images: {
            type: [String],
            default: [],
        },
        attributes: {
            type: Schema.Types.Mixed,
            default: {},
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
        collection: 'products',
    },
);

productSchema.index({ sku: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ category: 1, isActive: 1, createdAt: -1 });
productSchema.index({ category: 1, brand: 1 });
productSchema.index({ price: 1 });
productSchema.plugin(toJSONPlugin);

export const ProductModel = mongoose.model<IProductDocument>('Product', productSchema);
