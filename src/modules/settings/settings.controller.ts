import type { RequestHandler } from 'express';
import { settingsService } from './settings.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';

const getPublic: RequestHandler = catchAsync(async (req, res) => {
    const slug = req.params.slug as any;
    const setting = await settingsService.getPublicBySlug(slug);
    if (!setting) {
        return sendResponse(res, {
            statusCode: HTTP_STATUS.NOT_FOUND,
            message: MESSAGES.SETTINGS.NOT_FOUND,
            data: null,
        });
    }
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.SETTINGS.FETCHED,
        data: setting,
    });
});

const contact: RequestHandler = catchAsync(async (req, res) => {
    await settingsService.submitContact(req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.SETTINGS.MESSAGE_SENT,
        data: null,
    });
});

export const settingsController = { getPublic, contact };
