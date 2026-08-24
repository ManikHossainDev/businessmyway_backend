import type { RequestHandler } from 'express';
import { brandService } from './brand.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';
import { serializeBrand } from './brand.serializer';
import { parseOffsetPagination } from '@/shared/utils/pagination';

const list: RequestHandler = catchAsync(async (req, res) => {
    const categoryName = typeof req.query.category === 'string' ? req.query.category : undefined;
    const pagination = parseOffsetPagination(req.query as Record<string, unknown>);
    const result = await brandService.list(categoryName, pagination);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.BRAND.FETCHED,
        data: result.data.map((brand) => serializeBrand(brand)),
        meta: result.meta as unknown as Record<string, unknown>,
    });
});

const getById: RequestHandler = catchAsync(async (req, res) => {
    const brand = await brandService.getById(req.params.id as string);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.BRAND.FETCHED,
        data: serializeBrand(brand),
    });
});

export const brandController = { list, getById };
