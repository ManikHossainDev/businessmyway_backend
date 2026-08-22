import type { RequestHandler } from 'express';
import { adminSettingsService } from './settings.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';

const list: RequestHandler = catchAsync(async (req, res) => {
    const settings = await adminSettingsService.list();
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.SETTINGS.FETCHED,
        data: settings,
    });
});

const getBySlug: RequestHandler = catchAsync(async (req, res) => {
    const setting = await adminSettingsService.getBySlug(req.params.slug as any);
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

const update: RequestHandler = catchAsync(async (req, res) => {
    const setting = await adminSettingsService.upsert(req.params.slug as any, {
        title: req.body.title,
        content: req.body.content,
        metadata: req.body.metadata,
    });
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.SETTINGS.UPDATED,
        data: setting,
    });
});

const listContacts: RequestHandler = catchAsync(async (req, res) => {
    const contacts = await adminSettingsService.listContacts();
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.GENERAL.FETCHED,
        data: contacts,
    });
});

export const adminSettingsController = { list, getBySlug, update, listContacts };
