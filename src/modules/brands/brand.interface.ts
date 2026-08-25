import type { Document, Types } from 'mongoose';
import type { ICategory } from '@/modules/category/category.interface';

export interface IBrand {
    category: Types.ObjectId;
    title: string;
    description: string;
    subtitles: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IBrandDocument extends IBrand, Document {
    id: string;
}

export type IBrandPopulated = Omit<IBrand, 'category'> & {
    _id?: unknown;
    id?: string;
    category: (ICategory & { _id?: unknown; id?: string }) | Types.ObjectId;
    productCount?: number;
};
