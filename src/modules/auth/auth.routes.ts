import { Router } from 'express';
import { authenticate } from '@/shared/middlewares/authenticate';
import { authenticateResetPassword } from '@/shared/middlewares/authenticateResetPassword';
import { authenticateOnboarding } from '@/shared/middlewares/authenticateOnboarding';
import { validate } from '@/shared/middlewares/validate';
import { uploadFields, uploadSingle, setUploadDir } from '@/shared/middlewares/upload';
import { parseMultipartData } from '@/shared/middlewares/parseMultipartData';
import { authController } from './auth.controller';
import {
    loginBodySchema,
    refreshTokenBodySchema,
    registerBodySchema,
    forgotPasswordBodySchema,
    verifyResetCodeBodySchema,
    resendOtpBodySchema,
    verifyEmailBodySchema,
    changePasswordBodySchema,
    resetPasswordBodySchema,
} from './auth.validation';
import { completeProfileBodySchema } from '../user/user.validation';

const router = Router();

router.post('/register',
    setUploadDir('avatars'),
    uploadSingle('avatar'),
    parseMultipartData,
    validate({ body: registerBodySchema }),
    authController.register);

router.post('/login', validate({ body: loginBodySchema }), authController.login.bind(authController));

router.post('/refresh-token', validate({ body: refreshTokenBodySchema }), authController.refreshTokens);

router.post('/logout', validate({ body: refreshTokenBodySchema }), authController.logout);

router.get('/me', authenticate, authController.me);

router.post('/forgot-password', validate({ body: forgotPasswordBodySchema }), authController.forgotPassword);

router.post('/verify-reset-code', validate({ body: verifyResetCodeBodySchema }), authController.verifyResetCode);

router.post('/resend-otp', validate({ body: resendOtpBodySchema }), authController.resendOtp);

router.post('/verify-email', validate({ body: verifyEmailBodySchema }), authController.verifyEmail);

router.post('/change-password', authenticate, validate({ body: changePasswordBodySchema }),
    authController.changePassword);

router.post('/reset-password', authenticateResetPassword, validate({ body: resetPasswordBodySchema }), authController.resetPassword);

router.post(
    '/complete-profile',
    authenticateOnboarding,
    setUploadDir('profiles'),
    uploadFields([{ name: "avatar", maxCount: 1 }]),
    parseMultipartData,
    validate({ body: completeProfileBodySchema }),
    authController.completeProfile,
);

export default router;