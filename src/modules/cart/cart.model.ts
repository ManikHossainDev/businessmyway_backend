import mongoose, { Schema } from 'mongoose';
import type { ICartDocument } from './cart.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';

const cartSchema = new Schema<ICartDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
            index: true,
        },
        qty: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
        collection: 'carts',
    },
);

cartSchema.index({ user: 1, product: 1 }, { unique: true });
cartSchema.plugin(toJSONPlugin);

export const CartModel = mongoose.model<ICartDocument>('Cart', cartSchema);
