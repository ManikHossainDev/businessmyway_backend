import type { RequestHandler } from 'express';
import { notificationService } from '@/modules/notification/notification.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { parseOffsetPagination } from '@/shared/utils/pagination';
import { serializeNotifications } from '@/modules/notification/notification.serializer';

const listAll: RequestHandler = catchAsync(async (req, res) => {
    const pagination = parseOffsetPagination(req.query as Record<string, unknown>);
    const result = await notificationService.listAllNotifications(pagination);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Notifications fetched successfully.',
        data: serializeNotifications(result.data),
        meta: result.meta as unknown as Record<string, unknown>,
    });
});

const broadcast: RequestHandler = catchAsync(async (req, res) => {
    const result = await notificationService.broadcastToAllUsers(
        req.body.title,
        req.body.message,
        req.body.type,
        req.body.adminMessage,
    );
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Notification broadcast completed.',
        data: result,
    });
});

export const adminNotificationsController = { listAll, broadcast };
