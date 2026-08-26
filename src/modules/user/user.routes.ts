import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { authenticate } from '@/shared/middlewares/authenticate';
import { authorize } from '@/shared/middlewares/authorize';
import { uploadSingle, setUploadDir } from '@/shared/middlewares/upload';
import { parseMultipartData } from '@/shared/middlewares/parseMultipartData';
import { ROLES } from '@/core/constants/roles';
import { userController } from './user.controller';
import { listUsersQuerySchema, savedAddressBodySchema, savedAddressIdParamSchema, updateProfileBodySchema } from './user.validation';

const router = Router();

router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', setUploadDir('avatars'), uploadSingle('avatar'), parseMultipartData, validate({ body: updateProfileBodySchema }), userController.updateMe);
router.delete('/me', userController.deleteMe);
router.post(
    '/me/addresses',
    validate({ body: savedAddressBodySchema }),
    userController.addAddress,
);
router.put(
    '/me/addresses/:id',
    validate({ params: savedAddressIdParamSchema, body: savedAddressBodySchema }),
    userController.updateAddress,
);
router.patch(
    '/me/addresses/:id/default',
    validate({ params: savedAddressIdParamSchema }),
    userController.setDefaultAddress,
);
router.delete(
    '/me/addresses/:id',
    validate({ params: savedAddressIdParamSchema }),
    userController.removeAddress,
);
router.get(
    '/',
    authorize(ROLES.SUPER_ADMIN),
    validate({ query: listUsersQuerySchema }),
    userController.listUsers,
);

export default router;
