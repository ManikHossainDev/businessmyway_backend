import type { RequestHandler } from 'express';
import { deliveryService } from './delivery.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { serializeDelivery } from './delivery.serializer';

const getDelivery: RequestHandler = catchAsync(async (_req, res) => {
    const delivery = await deliveryService.getDelivery();
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Delivery configuration fetched successfully.',
        data: serializeDelivery(delivery),
    });
});

const updateDelivery: RequestHandler = catchAsync(async (req, res) => {
    const delivery = await deliveryService.updateDelivery(req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Delivery configuration updated successfully.',
        data: serializeDelivery(delivery),
    });
});

export const deliveryController = { getDelivery, updateDelivery };
