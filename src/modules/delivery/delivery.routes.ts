import { Router } from 'express';
import { deliveryController } from './delivery.controller';

const router = Router();

router.get('/', deliveryController.getDelivery);

export default router;
