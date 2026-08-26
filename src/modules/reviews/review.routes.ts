import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { authenticate } from '@/shared/middlewares/authenticate';
import { authorize } from '@/shared/middlewares/authorize';
import { ROLES } from '@/core/constants/roles';
import { reviewController } from './review.controller';
import { createReviewBodySchema } from './review.validation';

const router = Router();

router.get('/', reviewController.list);
router.post(
    '/',
    authenticate,
    authorize(ROLES.USER),
    validate({ body: createReviewBodySchema }),
    reviewController.create,
);

export default router;
