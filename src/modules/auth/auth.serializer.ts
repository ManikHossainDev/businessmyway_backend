import type { AuthResponse } from './auth.interface';

export const serializeAuthResponse = (result: AuthResponse) => ({
    user: result.user,
    tokens: result.tokens,
    onboarding: result.onboarding,
});
