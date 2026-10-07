import { Router } from 'express';
import { orderController } from '@/modules/orders/order.controller';
import { validate } from '@/shared/middlewares/validate';
import { updateOrderStatusBodySchema, orderIdParamSchema } from '@/modules/orders/order.validation';

const router = Router();

router.get('/', orderController.listAll);
router.patch(
    '/:id/status',
    validate({ params: orderIdParamSchema, body: updateOrderStatusBodySchema }),
    orderController.updateStatus,
);

export default router;
