import type { RequestHandler } from 'express';

import { UnauthorizedError } from '@/core/errors';
import { requestContext } from '@/infrastructure/context/request.context';
import { extractBearerToken, verifyForgotPassToken } from '@/modules/auth/strategies';

export const authenticateResetPassword: RequestHandler = (req, _res, next): void => {
    try {
        const token = extractBearerToken(req.header('authorization'));
        if (!token) {
            throw new UnauthorizedError('Reset token is missing.', 'AUTH_TOKEN_MISSING');
        }

        const payload = verifyForgotPassToken(token);

        req.user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name ?? '',
            role: payload.role,
            status: payload.status ?? 'active',
            registrationStrategy: payload.registrationStrategy ?? 'local',
            isEmailVerified: payload.isEmailVerified ?? false,
            onboardingStep: payload.onboardingStep ?? 'REGISTERED',
            isOnboardingCompleted: payload.isOnboardingCompleted ?? false,
            isDeleted: payload.isDeleted ?? false,
        };

        requestContext.setUserId(payload.sub);
        next();
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            next(error);
            return;
        }
        next(new UnauthorizedError('Invalid or expired reset token.', 'AUTH_TOKEN_INVALID'));
    }
};