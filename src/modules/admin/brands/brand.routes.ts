import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { adminBrandController } from './brand.controller';
import { brandIdParamSchema, createBrandBodySchema, listBrandsQuerySchema } from '@/modules/brands/brand.validation';

const router = Router();

router.get('/', validate({ query: listBrandsQuerySchema }), adminBrandController.list);
router.post('/', validate({ body: createBrandBodySchema }), adminBrandController.create);
router.put(
    '/:id',
    validate({ params: brandIdParamSchema, body: createBrandBodySchema }),
    adminBrandController.update,
);

export default router;
