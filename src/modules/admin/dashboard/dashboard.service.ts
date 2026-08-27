import { ROLES } from '@/core/constants/roles';
import { ProductModel } from '@/modules/products/product.model';
import { UserModel } from '@/modules/user/user.model';
import { OrderModel } from '@/modules/orders/order.model';
import { DELIVERY_TYPES, ORDER_STATUS } from '@/modules/orders/order.interface';

const RECENT_LIMIT = 10;
const userFilter = { isDeleted: { $ne: true }, role: ROLES.USER };

export class DashboardService {
    async getStats() {
        const [totalProducts, totalOrders, totalUsers, earningsAgg, recentOrders, recentUsers] =
            await Promise.all([
                ProductModel.countDocuments(),
                OrderModel.countDocuments(),
                UserModel.countDocuments(userFilter),
                OrderModel.aggregate<{ total: number }>([
                    {
                        $match: {
                            $or: [
                                { status: ORDER_STATUS.PAID },
                                {
                                    deliveryType: DELIVERY_TYPES.IN_DELIVERY,
                                    status: { $ne: ORDER_STATUS.CANCELLED },
                                },
                            ],
                        },
                    },
                    { $group: { _id: null, total: { $sum: '$total' } } },
                ]),
                OrderModel.find().sort({ createdAt: -1 }).limit(RECENT_LIMIT),
                UserModel.find(userFilter).sort({ createdAt: -1 }).limit(RECENT_LIMIT),
            ]);

        return {
            totalProducts,
            totalOrders,
            totalUsers,
            totalEarnings: Number(earningsAgg[0]?.total ?? 0),
            recentOrders,
            recentUsers,
        };
    }
}

export const dashboardService = new DashboardService();
