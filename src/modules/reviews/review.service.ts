import { ReviewModel } from './review.model';
import { NotFoundError } from '@/core/errors';
import { MESSAGES } from '@/core/constants/messages';
import type { CreateReviewBody } from './review.validation';

export class ReviewService {
    async list() {
        return ReviewModel.find().sort({ createdAt: -1 });
    }

    async create(payload: CreateReviewBody, userId?: string) {
        return ReviewModel.create({
            name: payload.name,
            text: payload.text,
            rating: payload.rating,
            tag: payload.tag?.trim() || 'Verified Buyer',
            ...(userId ? { user: userId } : {}),
        });
    }

    async remove(id: string) {
        const deleted = await ReviewModel.findByIdAndDelete(id);
        if (!deleted) {
            throw new NotFoundError(MESSAGES.REVIEW.NOT_FOUND, 'REVIEW_NOT_FOUND');
        }
        return deleted;
    }
}

export const reviewService = new ReviewService();
