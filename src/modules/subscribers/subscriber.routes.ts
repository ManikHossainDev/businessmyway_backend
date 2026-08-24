import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { subscriberController } from './subscriber.controller';
import { createSubscriberBodySchema } from './subscriber.validation';

const router = Router();

router.post('/', validate({ body: createSubscriberBodySchema }), subscriberController.create);

export default router;
