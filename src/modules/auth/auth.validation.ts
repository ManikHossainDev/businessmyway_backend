import { z } from 'zod';
import { ONBOARDING_STEPS } from '../user/user.constants';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

export const registerBodySchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8).max(72).regex(passwordRegex, 'Password must include uppercase, lowercase, number, and special character.'),
    confirmPassword: z.string().min(1),
    phone: z.string().trim().optional(),
    agreeTermsAndConditions: z.boolean({ error: 'You must agree to the terms and conditions' }),
}).refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export const loginBodySchema = z.object({
    email: z.string().trim().toLowerCase().email().optional(),
    password: z.string().min(1).optional(),
    provider: z.enum(['google', 'apple', 'instagram']).optional(),
    token: z.string().min(1).optional(),
    notificationToken: z.string().trim().optional(),
    deviceType: z.enum(['ios', 'android', 'web']).optional(),
}).refine(
    (data) => {
        if (data.provider && data.token) return true;
        if (data.email && data.password) return true;
        return false;
    },
    { message: 'Either email+password or provider+token is required' },
);

export const refreshTokenBodySchema = z.object({
    refreshToken: z.string().min(1),
});

export const forgotPasswordBodySchema = z.object({
    email: z.string().trim().toLowerCase().email(),
});

export const verifyResetCodeBodySchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    otp: z.string().trim().length(5).regex(/^\d+$/, 'Code must be a 5-digit number'),
    forgotPassToken: z.string().min(1, 'Reset token is required'),
});

export const resendOtpBodySchema = z.object({
    email: z.string().trim().toLowerCase().email(),
});

export const verifyEmailBodySchema = z.object({
    email: z.string().trim().toLowerCase().email(),
    otp: z.string().trim().length(5).regex(/^\d+$/, 'OTP must be a 5-digit number'),
});

export const changePasswordBodySchema = z.object({
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(8).max(72).regex(passwordRegex, 'Password must include uppercase, lowercase, number, and special character.'),
    isReset: z.boolean().default(false),
}).refine((d) => !d.currentPassword || d.currentPassword !== d.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
});

export const resetPasswordBodySchema = z.object({
    newPassword: z.string().min(8).max(72).regex(passwordRegex, 'Password must include uppercase, lowercase, number, and special character.'),
    confirmPassword: z.string().min(1),
}).refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshTokenBody = z.infer<typeof refreshTokenBodySchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;
export type VerifyResetCodeBody = z.infer<typeof verifyResetCodeBodySchema>;
export type ResendOtpBody = z.infer<typeof resendOtpBodySchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;