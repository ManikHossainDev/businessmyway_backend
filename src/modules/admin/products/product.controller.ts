import type { RequestHandler } from 'express';
import { productService } from '@/modules/products/product.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';
import { serializeProduct } from '@/modules/products/product.serializer';
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
        limit: req.query.limit ?? 10,
    });
    const result = await productService.list(req.query as Record<string, unknown>, pagination);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.PRODUCT.FETCHED,
        data: result.data.map((product) => serializeProduct(product)),
        meta: toMeta(result),
    });
});

const create: RequestHandler = catchAsync(async (req, res) => {
    const product = await productService.create(req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: MESSAGES.PRODUCT.CREATED,
        data: serializeProduct(product),
    });
});

const update: RequestHandler = catchAsync(async (req, res) => {
    const product = await productService.update(req.params.id as string, req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.PRODUCT.UPDATED,
        data: serializeProduct(product),
    });
});

const remove: RequestHandler = catchAsync(async (req, res) => {
    await productService.delete(req.params.id as string);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.PRODUCT.DELETED,
        data: null,
    });
});

export const adminProductController = { list, create, update, remove };
