import { Router } from 'express';
import { orderController } from '@/modules/orders/order.controller';
import { validate } from '@/shared/middlewares/validate';
import { updateOrderStatusBodySchema, orderIdParamSchema } from '@/modules/orders/order.validation';
import { setUploadDir, uploadSingle } from '@/shared/middlewares/upload';

const router = Router();

router.get('/', orderController.listAll);
router.patch(
    '/:id/status',
    validate({ params: orderIdParamSchema, body: updateOrderStatusBodySchema }),
    orderController.updateStatus,
);
router.post(
    '/:id/invoice',
    validate({ params: orderIdParamSchema }),
    setUploadDir('invoices'),
    uploadSingle('invoice'),
    orderController.uploadInvoice,
);
router.delete(
    '/:id/invoice',
    validate({ params: orderIdParamSchema }),
    orderController.deleteInvoice,
);

export default router;
