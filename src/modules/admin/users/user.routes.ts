import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { userController } from '@/modules/user/user.controller';
import { listUsersQuerySchema, userIdParamSchema } from '@/modules/user/user.validation';

const router = Router();

router.get('/', validate({ query: listUsersQuerySchema }), userController.listUsers);
router.patch(
    '/:id/approve',
    validate({ params: userIdParamSchema }),
    userController.approveUser,
);

export default router;
