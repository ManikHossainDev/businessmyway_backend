import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { categoryController } from './category.controller';
import { categoryIdParamSchema } from './category.validation';

const router = Router();

router.get('/', categoryController.list);
router.get('/:id', validate({ params: categoryIdParamSchema }), categoryController.getById);

export default router;
