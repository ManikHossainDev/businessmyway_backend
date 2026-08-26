import type { IReview } from './review.interface';

export const serializeReview = (review: (IReview & { id?: string; _id?: unknown }) | null) => {
    if (!review) return null;

    return {
        id: review.id || String(review._id || ''),
        name: review.name,
        text: review.text,
        rating: review.rating,
        tag: review.tag || 'Verified Buyer',
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
    };
};
