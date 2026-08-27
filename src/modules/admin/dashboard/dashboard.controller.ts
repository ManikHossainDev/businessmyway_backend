import type { RequestHandler } from 'express';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';
import { serializeOrder } from '@/modules/orders/order.serializer';
import { serializeUser } from '@/modules/user/user.serializer';
import { dashboardService } from './dashboard.service';

const getStats: RequestHandler = catchAsync(async (_req, res) => {
    const stats = await dashboardService.getStats();
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.DASHBOARD.FETCHED,
        data: {
            totalProducts: stats.totalProducts,
            totalOrders: stats.totalOrders,
            totalUsers: stats.totalUsers,
            totalEarnings: stats.totalEarnings,
            recentOrders: stats.recentOrders.map((order) => serializeOrder(order)),
            recentUsers: stats.recentUsers.map((user) => serializeUser(user)),
        },
    });
});

export const adminDashboardController = { getStats };
