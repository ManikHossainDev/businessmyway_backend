import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { authenticate } from '@/shared/middlewares/authenticate';
import { authorize } from '@/shared/middlewares/authorize';
import { ROLES } from '@/core/constants/roles';
import { reviewController } from './review.controller';
import { createReviewBodySchema, productIdParamSchema } from './review.validation';

const router = Router();

router.get('/', reviewController.list);
router.get(
    '/product/:productId',
    validate({ params: productIdParamSchema }),
    reviewController.listByProduct,
);
router.post(
    '/',
    authenticate,
    authorize(ROLES.USER),
    validate({ body: createReviewBodySchema }),
    reviewController.create,
);

export default router;
