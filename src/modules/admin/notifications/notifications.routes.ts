import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { adminNotificationsController } from './notifications.controller';
import { broadcastNotificationBodySchema } from '@/modules/notification/notification.validation';
import { authorize } from '@/shared/middlewares/authorize';
import { authenticate } from '@/shared/middlewares/authenticate';

const router = Router();

router.get('/', adminNotificationsController.listAll);
router.post('/broadcast', authenticate, authorize("admin"), validate({ body: broadcastNotificationBodySchema }), adminNotificationsController.broadcast);

export default router;
