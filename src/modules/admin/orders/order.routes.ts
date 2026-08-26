import { Router } from 'express';
import { orderController } from '@/modules/orders/order.controller';

const router = Router();

router.get('/', orderController.listAll);

export default router;
