import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { deliveryController } from '@/modules/delivery/delivery.controller';
import { updateDeliveryBodySchema } from '@/modules/delivery/delivery.validation';

const router = Router();

router.get('/', deliveryController.getDelivery);
router.patch('/', validate({ body: updateDeliveryBodySchema }), deliveryController.updateDelivery);
router.put('/', validate({ body: updateDeliveryBodySchema }), deliveryController.updateDelivery);

export default router;
