import mongoose, { Schema } from 'mongoose';
import type { IWishlistDocument } from './wishlist.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';

const wishlistSchema = new Schema<IWishlistDocument>(
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
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
        collection: 'wishlists',
    },
);

wishlistSchema.index({ user: 1, product: 1 }, { unique: true });
wishlistSchema.plugin(toJSONPlugin);

export const WishlistModel = mongoose.model<IWishlistDocument>('Wishlist', wishlistSchema);
