import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { brandController } from './brand.controller';
import { brandIdParamSchema, listBrandsQuerySchema } from './brand.validation';

const router = Router();

router.get('/', validate({ query: listBrandsQuerySchema }), brandController.list);
router.get('/:id', validate({ params: brandIdParamSchema }), brandController.getById);

export default router;
