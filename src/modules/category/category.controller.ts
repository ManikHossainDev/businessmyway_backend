import type { RequestHandler } from 'express';
import { categoryService } from './category.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';
import { serializeCategory } from './category.serializer';

const list: RequestHandler = catchAsync(async (_req, res) => {
    const categories = await categoryService.list();
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.CATEGORY.FETCHED,
        data: categories.map((category) => serializeCategory(category)),
    });
});

const getById: RequestHandler = catchAsync(async (req, res) => {
    const category = await categoryService.getById(req.params.id as string);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.CATEGORY.FETCHED,
        data: serializeCategory(category),
    });
});

export const categoryController = { list, getById };
