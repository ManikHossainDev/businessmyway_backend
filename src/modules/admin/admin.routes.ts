import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/authenticate';
import { authorize } from '@/shared/middlewares/authorize';
import settingsRoutes from './settings/settings.routes';
import notificationsRoutes from './notifications/notifications.routes';
import categoryRoutes from './category/category.routes';
import brandRoutes from './brands/brand.routes';
import subscriberRoutes from './subscribers/subscriber.routes';
import userRoutes from './users/user.routes';

const router = Router();

router.use(authenticate, authorize('superAdmin'));

router.use('/settings', settingsRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/subscribers', subscriberRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationsRoutes);

export default router;