import type { RequestHandler } from 'express';
import { reviewService } from './review.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';
import { serializeReview } from './review.serializer';

const list: RequestHandler = catchAsync(async (_req, res) => {
    const reviews = await reviewService.list();
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.REVIEW.FETCHED,
        data: reviews.map((review) => serializeReview(review)),
    });
});

const create: RequestHandler = catchAsync(async (req, res) => {
    const review = await reviewService.create(req.body, req.user?.id);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: MESSAGES.REVIEW.CREATED,
        data: serializeReview(review),
    });
});

export const reviewController = { list, create };
