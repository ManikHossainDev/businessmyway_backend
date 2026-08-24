import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { adminSubscriberController } from './subscriber.controller';
import {
    sendSubscriberEmailBodySchema,
    subscriberIdParamSchema,
} from '@/modules/subscribers/subscriber.validation';

const router = Router();

router.get('/', adminSubscriberController.list);
router.post(
    '/:id/email',
    validate({ params: subscriberIdParamSchema, body: sendSubscriberEmailBodySchema }),
    adminSubscriberController.sendEmail,
);

export default router;
