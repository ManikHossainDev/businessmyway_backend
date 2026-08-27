import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { authenticate } from '@/shared/middlewares/authenticate';
import { requireCustomer } from '@/shared/middlewares/authorize';
import { MESSAGES } from '@/core/constants/messages';
import { orderController } from './order.controller';
import { checkoutBodySchema, confirmOrderBodySchema, orderIdParamSchema } from './order.validation';

const router = Router();

router.use(authenticate, requireCustomer(MESSAGES.ORDER.USER_ONLY));

router.post('/checkout', validate({ body: checkoutBodySchema }), orderController.checkout);
router.get('/', orderController.list);
router.post(
    '/:id/confirm',
    validate({ params: orderIdParamSchema, body: confirmOrderBodySchema }),
    orderController.confirm,
);
router.get('/:id', validate({ params: orderIdParamSchema }), orderController.getOne);

export default router;
