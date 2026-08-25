import type { Document, Types } from 'mongoose';
import type { ICategory } from '@/modules/category/category.interface';
import type { IBrand } from '@/modules/brands/brand.interface';

export interface IProduct {
    name: string;
    slug: string;
    sku: string;
    category: Types.ObjectId;
    brand: Types.ObjectId;
    price: number;
    stockQty: number;
    description: string;
    image: string;
    images: string[];
    attributes: Record<string, string>;
    isActive: boolean;
    isFeatured: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IProductDocument extends IProduct, Document {
    id: string;
}

export type IProductPopulated = Omit<IProduct, 'category' | 'brand'> & {
    _id?: unknown;
    id?: string;
    category: (ICategory & { _id?: unknown; id?: string }) | Types.ObjectId;
    brand: (Pick<IBrand, 'title'> & { _id?: unknown; id?: string }) | Types.ObjectId;
};

export type ProductFacetItem = {
    label: string;
    count: number;
};

export type ProductFacets = Record<string, ProductFacetItem[]>;
