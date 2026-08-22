import type { RequestHandler } from 'express';

import { UnauthorizedError } from '@/core/errors';
import { requestContext } from '@/infrastructure/context/request.context';
import { extractBearerToken, verifyOnboardingToken } from '@/modules/auth/strategies';

export const authenticateOnboarding: RequestHandler = (req, _res, next): void => {
    try {
        const token = extractBearerToken(req.header('authorization'));
        if (!token) {
            throw new UnauthorizedError('Onboarding token is missing.', 'AUTH_TOKEN_MISSING');
        }

        const payload = verifyOnboardingToken(token);

        req.user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name ?? '',
            role: payload.role,
            status: payload.status ?? 'active',
            registrationStrategy: payload.registrationStrategy ?? 'local',
            isEmailVerified: payload.isEmailVerified ?? false,
            onboardingStep: payload.onboardingStep ?? 'VERIFIED',
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
        next(new UnauthorizedError('Invalid or expired onboarding token.', 'AUTH_TOKEN_INVALID'));
    }
};
