import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { productController } from './product.controller';
import { listProductsQuerySchema, productIdParamSchema } from './product.validation';

const router = Router();

router.get('/', validate({ query: listProductsQuerySchema }), productController.list);
router.get('/:id', validate({ params: productIdParamSchema }), productController.getById);

export default router;
