import rateLimit from 'express-rate-limit';

import { config } from '@/config';
import { MESSAGES } from '@/core/constants/messages';

export const globalRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: config.isProduction ? 120 : 1000,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        statusCode: 429,
        message: MESSAGES.GENERAL.RATE_LIMIT,
        errorCode: 'RATE_LIMITED',
    },
});
