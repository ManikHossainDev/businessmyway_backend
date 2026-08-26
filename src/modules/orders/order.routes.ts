import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { authenticate } from '@/shared/middlewares/authenticate';
import { orderController } from './order.controller';
import { checkoutBodySchema, confirmOrderBodySchema, orderIdParamSchema } from './order.validation';

const router = Router();

router.use(authenticate);

router.post('/checkout', validate({ body: checkoutBodySchema }), orderController.checkout);
router.get('/', orderController.list);
router.post(
    '/:id/confirm',
    validate({ params: orderIdParamSchema, body: confirmOrderBodySchema }),
    orderController.confirm,
);
router.get('/:id', validate({ params: orderIdParamSchema }), orderController.getOne);

export default router;
