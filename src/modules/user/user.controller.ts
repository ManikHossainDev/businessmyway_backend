import type { RequestHandler } from 'express';
import { userService } from './user.service';
import { catchAsync } from '@/shared/utils/catchAsync';
import { serializeUser } from './user.serializer';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { MESSAGES } from '@/core/constants/messages';
import { config } from '@/config';
import { s3StorageService } from '@/infrastructure/storage/s3.service';
import { getFileUrl } from '@/infrastructure/storage/local-storage';
import { parseOffsetPagination } from '@/shared/utils/pagination';

const getMe: RequestHandler = catchAsync(async (req, res) => {
    const user = await userService.getById(req.user!.id);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.USER.FETCHED,
        data: serializeUser(user),
    });
});

const updateMe: RequestHandler = catchAsync(async (req, res) => {
    const body = { ...req.body };
    const avatarFile = req.file;

    if (avatarFile) {
        if (config.storage.mode === 's3') {
            const result = await s3StorageService.upload(avatarFile.buffer || require('fs').readFileSync(avatarFile.path), 'avatars');
            body.avatar = result.url;
        } else {
            body.avatar = getFileUrl(avatarFile.filename, 'avatars');
        }
    }

    const user = await userService.updateProfile(req.user!.id, body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.USER.UPDATED,
        data: serializeUser(user),
    });
});

const getById: RequestHandler = catchAsync(async (req, res) => {
    const user = await userService.getById(req.params.id as string);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.USER.FETCHED,
        data: serializeUser(user),
    });
});

const listUsers: RequestHandler = catchAsync(async (req, res) => {
    const pagination = parseOffsetPagination(req.query as Record<string, unknown>);
    const query = req.query as Record<string, unknown>;
    const result = await userService.listUsers(
        {
            search: query.search,
            role: query.role,
            status: query.status,
            onboardingStep: query.onboardingStep,
            isOnboardingCompleted: query.isOnboardingCompleted,
        },
        pagination,
    );
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.USER.LIST_FETCHED,
        data: result.data.map((user) => serializeUser(user)),
        meta: result.meta as unknown as Record<string, unknown>,
    });
});

const deleteMe: RequestHandler = catchAsync(async (req, res) => {
    await userService.deleteById(req.user!.id);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.USER.DELETED,
        data: null,
    });
});

const addAddress: RequestHandler = catchAsync(async (req, res) => {
    const user = await userService.addAddress(req.user!.id, req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.CREATED,
        message: MESSAGES.USER.ADDRESS_ADDED,
        data: serializeUser(user),
    });
});

const updateAddress: RequestHandler = catchAsync(async (req, res) => {
    const user = await userService.updateAddress(req.user!.id, req.params.id as string, req.body);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.USER.ADDRESS_UPDATED,
        data: serializeUser(user),
    });
});

const removeAddress: RequestHandler = catchAsync(async (req, res) => {
    const user = await userService.removeAddress(req.user!.id, req.params.id as string);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.USER.ADDRESS_REMOVED,
        data: serializeUser(user),
    });
});

const setDefaultAddress: RequestHandler = catchAsync(async (req, res) => {
    const user = await userService.setDefaultAddress(req.user!.id, req.params.id as string);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.USER.ADDRESS_UPDATED,
        data: serializeUser(user),
    });
});

const approveUser: RequestHandler = catchAsync(async (req, res) => {
    const user = await userService.approveUser(req.params.id as string);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: MESSAGES.USER.APPROVED,
        data: serializeUser(user),
    });
});

export const userController = {
    getMe,
    updateMe,
    getById,
    listUsers,
    deleteMe,
    addAddress,
    updateAddress,
    removeAddress,
    setDefaultAddress,
    approveUser,
};
