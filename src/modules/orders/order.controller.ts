import type { RequestHandler } from 'express';
import type Stripe from 'stripe';
import { orderService } from './order.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';
import { BadRequestError } from '@/core/errors';
import { stripeService } from '@/infrastructure/stripe/stripe.service';
import { serializeOrder } from './order.serializer';

const checkout: RequestHandler = catchAsync(async (req, res) => {
    const result = await orderService.checkout(req.user!.id, req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: MESSAGES.STRIPE.CHECKOUT_CREATED,
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
        req.body.sessionId,
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

const stripeWebhook: RequestHandler = catchAsync(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
        throw new BadRequestError(MESSAGES.STRIPE.INVALID_SIGNATURE, 'STRIPE_SIGNATURE_MISSING');
    }

    const payload = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    const event = stripeService.verifyWebhookSignature(payload, signature);

    if (event.type === 'checkout.session.completed') {
        await orderService.fulfillFromWebhook(event.data.object as Stripe.Checkout.Session);
    }

    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.STRIPE.WEBHOOK_RECEIVED,
        data: { received: true, type: event.type },
    });
});

export const orderController = { checkout, list, listAll, getOne, confirm, stripeWebhook };
