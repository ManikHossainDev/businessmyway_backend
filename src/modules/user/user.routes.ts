import { Router } from 'express';
import { validate } from '@/shared/middlewares/validate';
import { authenticate } from '@/shared/middlewares/authenticate';
import { uploadSingle, setUploadDir } from '@/shared/middlewares/upload';
import { parseMultipartData } from '@/shared/middlewares/parseMultipartData';
import { userController } from './user.controller';
import { updateProfileBodySchema } from './user.validation';

const router = Router();

router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', setUploadDir('avatars'), uploadSingle('avatar'), parseMultipartData, validate({ body: updateProfileBodySchema }), userController.updateMe);
router.delete('/me', userController.deleteMe);

export default router;
