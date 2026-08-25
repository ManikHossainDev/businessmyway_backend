import type { Document, Types } from 'mongoose';
import type { IProductPopulated } from '@/modules/products/product.interface';

export interface ICart {
    user: Types.ObjectId;
    product: Types.ObjectId;
    qty: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICartDocument extends ICart, Document {
    id: string;
}

export type ICartPopulated = Omit<ICart, 'product'> & {
    _id?: unknown;
    id?: string;
    product: IProductPopulated | Types.ObjectId | null;
};
