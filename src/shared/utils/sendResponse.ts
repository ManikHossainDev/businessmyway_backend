import type { Response } from 'express';

import type { ApiSuccessResponse } from '@/core/types/response.types';

interface SendResponseOptions<T> {
    statusCode: number;
    message: string;
    data?: T;
    meta?: Record<string, unknown>;
}

export const sendResponse = <T = null>(res: Response, options: SendResponseOptions<T>): Response => {
    const payload: ApiSuccessResponse<T | null> = {
        success: true,
        statusCode: options.statusCode,
        message: options.message,
        data: options.data ?? null,
    };

    if (options.meta) {
        payload.meta = options.meta;
    }

    if (res.req.requestId) {
        payload.requestId = res.req.requestId;
    }

    return res.status(options.statusCode).json(payload);
};
