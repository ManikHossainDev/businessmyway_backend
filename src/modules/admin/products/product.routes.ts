import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { adminProductController } from './product.controller';
import {
    createProductBodySchema,
    listProductsQuerySchema,
    productIdParamSchema,
    updateProductBodySchema,
} from '@/modules/products/product.validation';

const router = Router();

router.get('/', validate({ query: listProductsQuerySchema }), adminProductController.list);
router.post('/', validate({ body: createProductBodySchema }), adminProductController.create);
router.put(
    '/:id',
    validate({ params: productIdParamSchema, body: updateProductBodySchema }),
    adminProductController.update,
);
router.delete(
    '/:id',
    validate({ params: productIdParamSchema }),
    adminProductController.remove,
);

export default router;
