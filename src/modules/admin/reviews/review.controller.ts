import type { RequestHandler } from 'express';
import { reviewService } from '@/modules/reviews/review.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';
import { serializeReview } from '@/modules/reviews/review.serializer';

const list: RequestHandler = catchAsync(async (_req, res) => {
    const reviews = await reviewService.list();
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.REVIEW.FETCHED,
        data: reviews.map((review) => serializeReview(review)),
    });
});

const remove: RequestHandler = catchAsync(async (req, res) => {
    await reviewService.remove(req.params.id as string);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.REVIEW.DELETED,
        data: null,
    });
});

export const adminReviewController = { list, remove };
