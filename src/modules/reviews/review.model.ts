import mongoose, { Schema } from 'mongoose';
import type { IReviewDocument } from './review.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';

const reviewSchema = new Schema<IReviewDocument>(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: 2,
            maxlength: 80,
        },
        text: {
            type: String,
            required: [true, 'Review text is required'],
            trim: true,
            minlength: 10,
            maxlength: 800,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
            default: 5,
        },
        tag: {
            type: String,
            trim: true,
            maxlength: 40,
            default: 'Verified Buyer',
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
        collection: 'reviews',
    },
);

reviewSchema.index({ createdAt: -1 });
reviewSchema.plugin(toJSONPlugin);

export const ReviewModel = mongoose.model<IReviewDocument>('Review', reviewSchema);
