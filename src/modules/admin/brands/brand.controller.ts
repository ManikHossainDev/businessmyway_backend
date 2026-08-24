import type { RequestHandler } from 'express';
import { brandService } from '@/modules/brands/brand.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';
import { serializeBrand } from '@/modules/brands/brand.serializer';
import { parseOffsetPagination } from '@/shared/utils/pagination';

const list: RequestHandler = catchAsync(async (req, res) => {
    const pagination = parseOffsetPagination(req.query as Record<string, unknown>);
    const result = await brandService.list(undefined, pagination);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.BRAND.FETCHED,
        data: result.data.map((brand) => serializeBrand(brand)),
        meta: result.meta as unknown as Record<string, unknown>,
    });
});

const create: RequestHandler = catchAsync(async (req, res) => {
    const brand = await brandService.create(req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: MESSAGES.BRAND.CREATED,
        data: serializeBrand(brand),
    });
});

const update: RequestHandler = catchAsync(async (req, res) => {
    const brand = await brandService.update(req.params.id as string, req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.BRAND.UPDATED,
        data: serializeBrand(brand),
    });
});

export const adminBrandController = { list, create, update };
