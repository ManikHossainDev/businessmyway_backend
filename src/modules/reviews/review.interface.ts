import type { Document, Types } from 'mongoose';

export interface IReview {
    name: string;
    text: string;
    rating: number;
    tag: string;
    user?: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IReviewDocument extends IReview, Document {
    id: string;
}
