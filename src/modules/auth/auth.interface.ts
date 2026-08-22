import type { AuthStrategy, UserStatus, OnboardingStep } from '../user/user.constants';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    phone: string;
    countryCode: string;
    role: string;
    status: UserStatus;
    registrationStrategy: AuthStrategy;
    lastLoginStrategy?: AuthStrategy;
    isEmailVerified: boolean;
    avatar?: string;
    address?: string;
    onboardingStep: OnboardingStep;
    isOnboardingCompleted: boolean;
    discountValue: number;
    commissionValue: number;
    notificationToken?: string;
    deviceType?: 'ios' | 'android' | 'web';
    expiresAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse {
    user: AuthUser;
    tokens: TokenPair;
    onboarding: {
        step: OnboardingStep;
        isCompleted: boolean;
        nextRoute: string;
    };
}

export interface RegisterInput {
    name: string;
    email: string;
    password: string;
    phone?: string;
    avatar?: string;
    agreeTermsAndConditions: boolean;
}

export interface RegisterResponse {
    userId: string;
    email: string;
    name: string;
    verificationToken: string;
}

export interface LoginInput {
    email?: string;
    password?: string;
    provider?: 'google' | 'apple' | 'instagram';
    token?: string;
    notificationToken?: string;
    deviceType?: 'ios' | 'android' | 'web';
}

export interface RefreshInput {
    refreshToken: string;
}

export interface ForgotPasswordInput {
    email: string;
}

export interface ForgotPasswordResponse {
    forgotPassToken: string;
    message: string;
}

export interface VerifyResetCodeInput {
    email: string;
    otp: string;
    forgotPassToken: string;
}

export interface VerifyResetCodeResponse {
    accessToken: string;
}

export interface ResendOtpInput {
    email: string;
}

export interface VerifyEmailInput {
    email: string;
    otp: string;
}

export interface VerifyEmailResponse {
    message: string;
}

export interface ChangePasswordInput {
    currentPassword?: string;
    newPassword: string;
    isReset?: boolean;
}

export interface OAuthCallbackInput {
    code: string;
}

export interface ResetPasswordInput {
    newPassword: string;
    confirmPassword: string;
}