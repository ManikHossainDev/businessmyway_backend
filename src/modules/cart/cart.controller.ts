import type { RequestHandler } from 'express';
import { cartService } from './cart.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';
import { serializeCartItem } from './cart.serializer';

const toData = (items: Awaited<ReturnType<typeof cartService.list>>) =>
    items.map((item) => serializeCartItem(item)).filter(Boolean);

const list: RequestHandler = catchAsync(async (req, res) => {
    const items = await cartService.list(req.user!.id);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.CART.FETCHED,
        data: toData(items),
    });
});

const add: RequestHandler = catchAsync(async (req, res) => {
    const items = await cartService.add(req.user!.id, req.body.productId, req.body.qty ?? 1);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.CART.ADDED,
        data: toData(items),
    });
});

const update: RequestHandler = catchAsync(async (req, res) => {
    const items = await cartService.updateQty(
        req.user!.id,
        req.params.productId as string,
        req.body.qty,
    );
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.CART.UPDATED,
        data: toData(items),
    });
});

const remove: RequestHandler = catchAsync(async (req, res) => {
    await cartService.remove(req.user!.id, req.params.productId as string);
    const items = await cartService.list(req.user!.id);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.CART.REMOVED,
        data: toData(items),
    });
});

const clear: RequestHandler = catchAsync(async (req, res) => {
    await cartService.clear(req.user!.id);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.CART.CLEARED,
        data: [],
    });
});

export const cartController = { list, add, update, remove, clear };
