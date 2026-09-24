import type { RequestHandler } from 'express';

import { orderService } from './order.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';
import { BadRequestError } from '@/core/errors';

import { vivaService } from '@/infrastructure/viva/viva.service';
import { serializeOrder } from './order.serializer';

const checkout: RequestHandler = catchAsync(async (req, res) => {
    const result = await orderService.checkout(req.user!.id, req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: MESSAGES.ORDER.CREATED,
        data: result,
    });
});

const list: RequestHandler = catchAsync(async (req, res) => {
    const orders = await orderService.list(req.user!.id);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.ORDER.LIST_FETCHED,
        data: orders.map((order) => serializeOrder(order)),
    });
});

const getOne: RequestHandler = catchAsync(async (req, res) => {
    const order = await orderService.getById(req.user!.id, req.params.id as string);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.ORDER.FETCHED,
        data: serializeOrder(order),
    });
});

const confirm: RequestHandler = catchAsync(async (req, res) => {
    const order = await orderService.confirm(
        req.user!.id,
        req.params.id as string,
        req.body,
    );
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.ORDER.PAID,
        data: serializeOrder(order),
    });
});

const listAll: RequestHandler = catchAsync(async (_req, res) => {
    const orders = await orderService.listAll();
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.ORDER.LIST_FETCHED,
        data: orders.map((order) => serializeOrder(order)),
    });
});

const vivaWebhook: RequestHandler = catchAsync(async (req, res) => {
    if (req.method === 'GET') {
        const key = await vivaService.getWebhookVerificationKey();
        return res.status(HTTP_STATUS.OK).json({ Key: key });
    }

    const eventData = req.body?.EventData || req.body;
    if (eventData) {
        await orderService.fulfillFromVivaWebhook(eventData);
    }

    return res.status(HTTP_STATUS.OK).json({ received: true });
});

export const orderController = { checkout, list, listAll, getOne, confirm, vivaWebhook };
