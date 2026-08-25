import type { RequestHandler } from 'express';
import { productService } from './product.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';
import { serializeProduct } from './product.serializer';
import { parseOffsetPagination } from '@/shared/utils/pagination';

const toMeta = (result: Awaited<ReturnType<typeof productService.list>>) => {
    const { _total, ...facets } = result.facets as Record<string, unknown>;
    return {
        ...result.meta,
        totalInCategory: result.totalInCategory ?? _total ?? result.meta.total,
        facets,
    };
};

const list: RequestHandler = catchAsync(async (req, res) => {
    const pagination = parseOffsetPagination({
        ...(req.query as Record<string, unknown>),
        limit: req.query.limit ?? 8,
    });
    const result = await productService.list(req.query as Record<string, unknown>, pagination, {
        activeOnly: true,
    });
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.PRODUCT.FETCHED,
        data: result.data.map((product) => serializeProduct(product)),
        meta: toMeta(result),
    });
});

const getById: RequestHandler = catchAsync(async (req, res) => {
    const product = await productService.getById(req.params.id as string);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.PRODUCT.FETCHED,
        data: serializeProduct(product),
    });
});

export const productController = { list, getById };
