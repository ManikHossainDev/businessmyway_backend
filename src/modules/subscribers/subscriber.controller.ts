import type { RequestHandler } from 'express';
import { subscriberService } from './subscriber.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';
import { serializeSubscriber } from './subscriber.serializer';

const create: RequestHandler = catchAsync(async (req, res) => {
    const subscriber = await subscriberService.create(req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: MESSAGES.SUBSCRIBER.CREATED,
        data: serializeSubscriber(subscriber),
    });
});

export const subscriberController = { create };
