import type { Document, Types } from 'mongoose';
import type { IProductPopulated } from '@/modules/products/product.interface';

export interface IWishlist {
    user: Types.ObjectId;
    product: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IWishlistDocument extends IWishlist, Document {
    id: string;
}

export type IWishlistPopulated = Omit<IWishlist, 'product'> & {
    _id?: unknown;
    id?: string;
    product: IProductPopulated | Types.ObjectId | null;
};
