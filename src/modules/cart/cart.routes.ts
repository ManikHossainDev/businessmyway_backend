import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { authenticate } from '@/shared/middlewares/authenticate';
import { requireCustomer } from '@/shared/middlewares/authorize';
import { MESSAGES } from '@/core/constants/messages';
import { cartController } from './cart.controller';
import {
    addCartBodySchema,
    cartProductParamSchema,
    updateCartBodySchema,
} from './cart.validation';

const router = Router();

router.use(authenticate, requireCustomer(MESSAGES.CART.USER_ONLY));

router.get('/', cartController.list);
router.delete('/', cartController.clear);
router.post('/', validate({ body: addCartBodySchema }), cartController.add);
router.patch(
    '/:productId',
    validate({ params: cartProductParamSchema, body: updateCartBodySchema }),
    cartController.update,
);
router.delete(
    '/:productId',
    validate({ params: cartProductParamSchema }),
    cartController.remove,
);

export default router;
