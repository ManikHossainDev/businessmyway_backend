import type { RequestHandler } from 'express';
import { categoryService } from '@/modules/category/category.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';
import { serializeCategory } from '@/modules/category/category.serializer';

const list: RequestHandler = catchAsync(async (_req, res) => {
    const categories = await categoryService.list();
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.CATEGORY.FETCHED,
        data: categories.map((category) => serializeCategory(category)),
    });
});

const create: RequestHandler = catchAsync(async (req, res) => {
    const category = await categoryService.create(req.body.name);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: MESSAGES.CATEGORY.CREATED,
        data: serializeCategory(category),
    });
});

const update: RequestHandler = catchAsync(async (req, res) => {
    const category = await categoryService.update(req.params.id as string, req.body.name);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.CATEGORY.UPDATED,
        data: serializeCategory(category),
    });
});

const remove: RequestHandler = catchAsync(async (req, res) => {
    await categoryService.remove(req.params.id as string);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.CATEGORY.DELETED,
        data: null,
    });
});

export const adminCategoryController = { list, create, update, remove };
