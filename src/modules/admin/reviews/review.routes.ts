import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { adminReviewController } from './review.controller';
import { reviewIdParamSchema } from '@/modules/reviews/review.validation';

const router = Router();

router.get('/', adminReviewController.list);
router.delete(
    '/:id',
    validate({ params: reviewIdParamSchema }),
    adminReviewController.remove,
);

export default router;
