import type { RequestHandler } from 'express';
import { wishlistService } from './wishlist.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';
import { serializeProduct } from '@/modules/products/product.serializer';

const list: RequestHandler = catchAsync(async (req, res) => {
    const products = await wishlistService.list(req.user!.id);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.WISHLIST.FETCHED,
        data: products.map((product) => serializeProduct(product)),
    });
});

const listIds: RequestHandler = catchAsync(async (req, res) => {
    const ids = await wishlistService.listIds(req.user!.id);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.WISHLIST.FETCHED,
        data: ids,
    });
});

const add: RequestHandler = catchAsync(async (req, res) => {
    const product = await wishlistService.add(req.user!.id, req.body.productId);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: MESSAGES.WISHLIST.ADDED,
        data: serializeProduct(product),
    });
});

const remove: RequestHandler = catchAsync(async (req, res) => {
    await wishlistService.remove(req.user!.id, req.params.productId as string);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.WISHLIST.REMOVED,
        data: null,
    });
});

export const wishlistController = { list, listIds, add, remove };
