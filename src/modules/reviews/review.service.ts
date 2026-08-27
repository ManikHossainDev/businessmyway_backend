import { ReviewModel } from './review.model';
import { ProductModel } from '@/modules/products/product.model';
import { NotFoundError, ConflictError } from '@/core/errors';
import { MESSAGES } from '@/core/constants/messages';
import type { CreateReviewBody } from './review.validation';

export class ReviewService {
    async list() {
        return ReviewModel.find()
            .sort({ createdAt: -1 })
            .populate({ path: 'product', select: 'name' })
            .populate({ path: 'user', select: 'name avatar savedAddresses' });
    }

    async listByProduct(productId: string) {
        const product = await ProductModel.findById(productId).select('_id').lean();
        if (!product) {
            throw new NotFoundError(MESSAGES.PRODUCT.NOT_FOUND, 'PRODUCT_NOT_FOUND');
        }

        const reviews = await ReviewModel.find({ product: productId })
            .sort({ createdAt: -1 })
            .populate({ path: 'user', select: 'name avatar savedAddresses' });
        const count = reviews.length;
        const averageRating =
            count > 0
                ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / count
                : 0;

        return {
            reviews,
            meta: {
                count,
                averageRating: Number(averageRating.toFixed(1)),
            },
        };
    }

    async create(payload: CreateReviewBody, userId?: string) {
        if (payload.productId) {
            const product = await ProductModel.findById(payload.productId).select('_id').lean();
            if (!product) {
                throw new NotFoundError(MESSAGES.PRODUCT.NOT_FOUND, 'PRODUCT_NOT_FOUND');
            }
        }

        try {
            return await ReviewModel.create({
                name: payload.name,
                text: payload.text,
                rating: payload.rating,
                tag: payload.tag?.trim() || 'Verified Buyer',
                ...(payload.productId ? { product: payload.productId } : {}),
                ...(userId ? { user: userId } : {}),
            });
        } catch (error) {
            if ((error as { code?: number }).code === 11000) {
                throw new ConflictError(
                    MESSAGES.REVIEW.ALREADY_EXISTS,
                    'REVIEW_ALREADY_EXISTS',
                );
            }
            throw error;
        }
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
