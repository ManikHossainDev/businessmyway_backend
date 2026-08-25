import type { Request, RequestHandler } from 'express';
import type { ZodError, ZodType } from 'zod';

import { BadRequestError } from '@/core/errors';

interface ValidationSchema {
    body?: ZodType;
    params?: ZodType;
    query?: ZodType;
}

const mapZodError = (error: ZodError): Record<string, unknown> => {
    return {
        errors: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
        })),
    };
};

export const validate = (schema: ValidationSchema): RequestHandler => {

    return (req, _res, next): void => {
        try {
            if (schema.body) {
                req.body = schema.body.parse(req.body) as typeof req.body;
            }

            if (schema.params) {
                req.params = schema.params.parse(req.params) as typeof req.params;
            }

            if (schema.query) {
                const parsedQuery = schema.query.parse(req.query) as Request['query'];
                // Express 5 `req.query` is a getter that re-parses the URL as strings.
                // Replace the property so coerced numbers (minPrice/maxPrice) survive.
                Object.defineProperty(req, 'query', {
                    value: parsedQuery,
                    writable: true,
                    configurable: true,
                    enumerable: true,
                });
            }

            next();
        } catch (error) {
            if (error && typeof error === 'object' && 'issues' in error) {
                const details = mapZodError(error as ZodError);
                next(new BadRequestError('Validation failed', 'VALIDATION_ERROR', details));
                return;
            }

            next(error);
        }
    };
};
