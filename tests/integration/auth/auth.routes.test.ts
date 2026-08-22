import request from 'supertest';

import { app } from '../../../src/app';
import { authService } from '../../../src/modules/auth/auth.service';
import { AUTH_STRATEGIES, ONBOARDING_STEPS } from '../../../src/modules/user/user.constants';

describe('Auth routes', () => {
    it('POST /api/v1/auth/login returns login payload', async () => {
        jest.spyOn(authService, 'login').mockResolvedValue({
            user: {
                id: '507f1f77bcf86cd799439011',
                name: 'Alice Example',
                phone: '+1231231234',
                countryCode: 'US',
                email: 'alice@example.com',
                role: 'user',
                status: 'active',
                registrationStrategy: AUTH_STRATEGIES.LOCAL,
                lastLoginStrategy: AUTH_STRATEGIES.LOCAL,
                isEmailVerified: false,
                onboardingStep: ONBOARDING_STEPS.REGISTERED,
                isOnboardingCompleted: false,
                discountValue: 0,
                commissionValue: 0,
            },
            tokens: {
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            },
            onboarding: {
                step: ONBOARDING_STEPS.REGISTERED,
                isCompleted: false,
                nextRoute: '/onboarding/verify-email',
            },
        });

        const response = await request(app).post('/api/v1/auth/login').send({
            email: 'alice@example.com',
            password: 'Password@123',
        });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.tokens.accessToken).toBe('access-token');
    });

    it('POST /api/v1/auth/login validates payload', async () => {
        const response = await request(app).post('/api/v1/auth/login').send({
            email: 'alice@example.com',
        });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errorCode).toBe('VALIDATION_ERROR');
    });

    it('GET /api/v1/auth/me rejects unauthenticated request', async () => {
        const response = await request(app).get('/api/v1/auth/me');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });
});
