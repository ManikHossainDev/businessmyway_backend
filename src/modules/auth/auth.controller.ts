import path from 'node:path';
import type { RequestHandler } from 'express';
import { authService } from './auth.service';
import { UnauthorizedError } from '@/core/errors';
import { userService } from '../user/user.service';
import { MESSAGES } from '@/core/constants/messages';
import { catchAsync } from '@/shared/utils/catchAsync';
import { serializeUser } from '../user/user.serializer';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { serializeAuthResponse } from './auth.serializer';
import { sendResponse } from '@/shared/utils/sendResponse';
import { config } from '@/config';
import { s3StorageService } from '@/infrastructure/storage/s3.service';
import { getFileUrl, UPLOAD_DIRECTORY } from '@/infrastructure/storage/local-storage';
import { BadRequestError } from '@/core/errors';

const getCurrentUserId = (userId?: string): string => {
    if (!userId) throw new UnauthorizedError('Authentication required.');
    return userId;
};

const register: RequestHandler = catchAsync(async (req, res) => {
    const body = { ...req.body };

    // Handle avatar file upload if present
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const avatarFiles = files?.avatar;
    if (avatarFiles && avatarFiles.length > 0) {
        const file = avatarFiles[0]!;
        if (config.storage.mode === 's3') {
            const result = await s3StorageService.upload(file.buffer || require('fs').readFileSync(file.path), 'avatars');
            body.avatar = result.url;
        } else {
            const subDir = path.relative(UPLOAD_DIRECTORY, file.destination);
            body.avatar = getFileUrl(file.filename, subDir);
        }
    }

    const result = await authService.register(body);
    sendResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: MESSAGES.AUTH.REGISTER_SUCCESS,
        data: { userId: result.userId, email: result.email, name: result.name, verificationToken: result.verificationToken },
    });
});

const login: RequestHandler = catchAsync(async (req, res) => {
    const result = await authService.login(req.body);
    sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.AUTH.LOGIN_SUCCESS,
        data: serializeAuthResponse(result),
    });
});

const refreshTokens: RequestHandler = catchAsync(async (req, res) => {
    const result = await authService.refreshTokens(req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.AUTH.TOKEN_REFRESHED,
        data: serializeAuthResponse(result),
    });
});

const logout: RequestHandler = catchAsync(async (req, res) => {
    await authService.logout(req.body.accessToken);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.AUTH.LOGOUT_SUCCESS,
        data: null,
    });
});

const me: RequestHandler = catchAsync(async (req, res) => {
    const userId = getCurrentUserId(req.user?.id);
    const user = await userService.getById(userId);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.USER.FETCHED,
        data: serializeUser(user),
    });
});

const forgotPassword: RequestHandler = catchAsync(async (req, res) => {
    const result = await authService.forgotPassword(req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: result.message,
        data: { forgotPassToken: result.forgotPassToken },
    });
});

const verifyResetCode: RequestHandler = catchAsync(async (req, res) => {
    const result = await authService.verifyResetCode(req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Code verified. You can now change your password.',
        data: { accessToken: result.accessToken },
    });
});

const resendOtp: RequestHandler = catchAsync(async (req, res) => {
    await authService.resendOtp(req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Verification code sent successfully.',
        data: null,
    });
});

const verifyEmail: RequestHandler = catchAsync(async (req, res) => {
    const result = await authService.verifyEmail(req.body);
    sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: result.message,
        data: null,
    });
});

const changePassword: RequestHandler = catchAsync(async (req, res) => {
    const userId = getCurrentUserId(req.user?.id);
    await authService.changePassword(userId, req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.AUTH.PASSWORD_CHANGED,
        data: null,
    });
});

const resetPassword: RequestHandler = catchAsync(async (req, res) => {
    const userId = getCurrentUserId(req.user?.id);
    await authService.resetPassword(userId, req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.AUTH.PASSWORD_RESET_SUCCESS,
        data: null,
    });
});

const completeProfile: RequestHandler = catchAsync(async (req, res) => {
    const userId = getCurrentUserId(req.user?.id);
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const body = { ...req.body };

    if (files?.avatar?.length) {
        const file = files.avatar[0];
        if (!file) throw new BadRequestError('Avatar file upload failed');
        if (config.storage.mode === 's3') {
            const result = await s3StorageService.upload(file.buffer || require('fs').readFileSync(file.path), 'avatars');
            body.avatar = result.url;
        } else {
            const subDir = path.relative(UPLOAD_DIRECTORY, file.destination);
            body.avatar = getFileUrl(file.filename, subDir);
        }
    } else {
        throw new BadRequestError('Avatar is required');
    }

    const result = await authService.completeProfile(userId, body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.USER.PROFILE_COMPLETED,
        data: result.onboarding,
    });
});

export const authController = {
    register, login, refreshTokens, logout, me,
    forgotPassword, verifyResetCode, resendOtp, verifyEmail,
    changePassword, resetPassword, completeProfile,
};