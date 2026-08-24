import type { Document } from 'mongoose';

export interface ICategory {
    name: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICategoryDocument extends ICategory, Document {
    id: string;
}
