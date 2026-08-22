import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/authenticate';
import { authorize } from '@/shared/middlewares/authorize';
import settingsRoutes from './settings/settings.routes';
import notificationsRoutes from './notifications/notifications.routes';

const router = Router();

router.use(authenticate, authorize('superAdmin'));

router.use('/settings', settingsRoutes);
router.use('/notifications', notificationsRoutes);

export default router;