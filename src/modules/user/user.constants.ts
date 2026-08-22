export const USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    BLOCKED: 'blocked',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export const AUTH_STRATEGIES = {
    LOCAL: 'local',
    GOOGLE: 'google',
    APPLE: 'apple',
    INSTAGRAM: 'instagram',
} as const;

export type AuthStrategy = (typeof AUTH_STRATEGIES)[keyof typeof AUTH_STRATEGIES];

export const USER_DEFAULTS = {
    STATUS: USER_STATUS.ACTIVE,
    REGISTRATION_STRATEGY: AUTH_STRATEGIES.LOCAL,
    IS_DELETED: false,
} as const;

export const ONBOARDING_STEPS = {
    REGISTERED: 'REGISTERED',
    VERIFIED: 'VERIFIED',
    PROFILE_COMPLETED: 'PROFILE_COMPLETED',
    UNDER_REVIEW: 'UNDER_REVIEW',
    APPROVED: 'APPROVED',
} as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

export const ONBOARDING_FLOW: OnboardingStep[] = [
    ONBOARDING_STEPS.REGISTERED,
    ONBOARDING_STEPS.VERIFIED,
    ONBOARDING_STEPS.PROFILE_COMPLETED,
    ONBOARDING_STEPS.UNDER_REVIEW,
    ONBOARDING_STEPS.APPROVED,
];

export const ONBOARDING_REDIRECTS: Record<OnboardingStep, string> = {
    [ONBOARDING_STEPS.REGISTERED]: '/onboarding/verify-email',
    [ONBOARDING_STEPS.VERIFIED]: '/onboarding/profile',
    [ONBOARDING_STEPS.PROFILE_COMPLETED]: '/onboarding/pending-review',
    [ONBOARDING_STEPS.UNDER_REVIEW]: '/onboarding/pending-review',
    [ONBOARDING_STEPS.APPROVED]: '/home',
};