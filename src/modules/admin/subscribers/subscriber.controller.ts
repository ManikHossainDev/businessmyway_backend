import type { RequestHandler } from 'express';
import { subscriberService } from '@/modules/subscribers/subscriber.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';

const list: RequestHandler = catchAsync(async (_req, res) => {
    const subscribers = await subscriberService.list();
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.SUBSCRIBER.FETCHED,
        data: subscribers,
    });
});

const sendEmail: RequestHandler = catchAsync(async (req, res) => {
    const result = await subscriberService.sendEmail(req.params.id as string, req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.SUBSCRIBER.EMAIL_SENT,
        data: result,
    });
});

export const adminSubscriberController = { list, sendEmail };
