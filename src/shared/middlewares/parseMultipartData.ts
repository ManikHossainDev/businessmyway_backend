import type { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '@/core/errors';

export const parseMultipartData = (_req: Request, _res: Response, next: NextFunction) => {
    if (_req.headers['content-type']?.startsWith('multipart/form-data') && typeof _req.body?.data === 'string') {
        try {
            const parsed = JSON.parse(_req.body.data);
            _req.body = { ..._req.body, ...parsed };
            delete _req.body.data;
        } catch {
            return next(new BadRequestError('Invalid JSON in "data" field'));
        }
    }
    next();
};
