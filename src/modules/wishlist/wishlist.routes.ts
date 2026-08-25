import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { authenticate } from '@/shared/middlewares/authenticate';
import { wishlistController } from './wishlist.controller';
import { addWishlistBodySchema, wishlistProductParamSchema } from './wishlist.validation';

const router = Router();

router.use(authenticate);

router.get('/', wishlistController.list);
router.get('/ids', wishlistController.listIds);
router.post('/', validate({ body: addWishlistBodySchema }), wishlistController.add);
router.delete(
    '/:productId',
    validate({ params: wishlistProductParamSchema }),
    wishlistController.remove,
);

export default router;
