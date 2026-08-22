import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { MulterError } from 'multer';

import { config } from '@/config';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { AppError, BadRequestError } from '@/core/errors';
import { logger } from '@/infrastructure/logger/winston.logger';
import type { ApiErrorResponse } from '@/core/types/response.types';

const normalizeError = (error: unknown): AppError => {
    if (error instanceof AppError) {
        return error;
    }

    if (error instanceof ZodError) {
        return new BadRequestError('Validation failed', 'VALIDATION_ERROR', {
            errors: error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            })),
        });
    }

    if (error instanceof mongoose.Error.ValidationError) {
        return new BadRequestError('Validation failed', 'VALIDATION_ERROR', {
            errors: Object.values(error.errors).map((item) => ({
                field: item.path,
                message: item.message,
            })),
        });
    }

    if (error instanceof mongoose.Error.CastError) {
        return new BadRequestError('Invalid identifier format.', 'INVALID_ID', {
            field: error.path,
        });
    }

    if (error instanceof MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return new AppError(HTTP_STATUS.BAD_REQUEST, 'File too large. Maximum size is 5MB.', 'FILE_TOO_LARGE');
        }
        return new AppError(HTTP_STATUS.BAD_REQUEST, error.message, 'INVALID_FILE');
    }

    if (error instanceof Error) {
        if (error.name === 'AbortError') {
            return new AppError(
                HTTP_STATUS.REQUEST_TIMEOUT,
                'Request processing timed out.',
                'REQUEST_TIMEOUT',
            );
        }
        return new AppError(500, error.message, 'INTERNAL_ERROR', false);
    }

    const message = typeof error === 'string' ? error : 'An unexpected error occurred.';
    return new AppError(500, message, 'INTERNAL_ERROR', false);
};

export const globalErrorHandler: ErrorRequestHandler = (error, req, res, _next) => {
    const normalized = normalizeError(error);
    const payload: ApiErrorResponse = {
        success: false,
        statusCode: normalized.statusCode,
        message: normalized.message,
        errorCode: normalized.errorCode,
    };

    if (normalized.details) {
        payload.data = normalized.details;
    }

    if (req.requestId) {
        payload.requestId = req.requestId;
    }

    if (normalized.details?.errors) {
        payload.errors = normalized.details.errors as ApiErrorResponse['errors'];
    }

    if (!config.isProduction && error instanceof Error && error.stack) {
        payload.stack = error.stack;
    }

    const logPayload = {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: normalized.statusCode,
        errorCode: normalized.errorCode,
        message: normalized.message,
        details: normalized.details,
    };

    if (normalized.statusCode >= 500 || !normalized.isOperational) {
        logger.error('Request failed', logPayload);
    } else {
        logger.warn('Request failed', logPayload);
    }

    res.status(normalized.statusCode).json(payload);
};
