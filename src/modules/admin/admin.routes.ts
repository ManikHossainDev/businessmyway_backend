import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/authenticate';
import { authorize } from '@/shared/middlewares/authorize';
import settingsRoutes from './settings/settings.routes';
import notificationsRoutes from './notifications/notifications.routes';
import categoryRoutes from './category/category.routes';
import brandRoutes from './brands/brand.routes';
import subscriberRoutes from './subscribers/subscriber.routes';
import userRoutes from './users/user.routes';
import productRoutes from './products/product.routes';
import orderRoutes from './orders/order.routes';
import reviewRoutes from './reviews/review.routes';

const router = Router();

router.use(authenticate, authorize('superAdmin'));

router.use('/settings', settingsRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/subscribers', subscriberRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationsRoutes);

export default router;