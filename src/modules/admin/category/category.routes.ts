import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { adminCategoryController } from './category.controller';
import { createCategoryBodySchema, categoryIdParamSchema } from '@/modules/category/category.validation';

const router = Router();

router.get('/', adminCategoryController.list);
router.post('/', validate({ body: createCategoryBodySchema }), adminCategoryController.create);
router.put(
    '/:id',
    validate({ params: categoryIdParamSchema, body: createCategoryBodySchema }),
    adminCategoryController.update,
);
router.delete(
    '/:id',
    validate({ params: categoryIdParamSchema }),
    adminCategoryController.remove,
);

export default router;
