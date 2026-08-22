import { logger } from '../../logger/winston.logger';
import type { IEventBus } from '@/core/interfaces/event-bus.interface';
import { notificationService } from '@/modules/notification/notification.service';
import { NOTIFICATION_TYPES } from '@/modules/notification/notification.constants';
import { addMailLog, markEmailVerified } from '@/infrastructure/mail/mail.log';
import { mailService } from '@/infrastructure/mail/mail.service';
import { config } from '@/config';

interface OtpPayload {
    userId: string;
    email: string;
    name: string;
    otp: string;
    expiresAt: Date;
}

interface UserPayload {
    userId: string;
    email: string;
    name: string;
}

const otpStore: Map<string, { otp: string; expiresAt: Date }> = new Map();

export const getDevOtp = (email: string): string | null => {
    const entry = otpStore.get(email.toLowerCase());
    if (!entry) return null;
    if (new Date() > entry.expiresAt) {
        otpStore.delete(email.toLowerCase());
        return null;
    }
    return entry.otp;
};

export const registerAuthListeners = (bus: IEventBus): void => {
    bus.on<OtpPayload>('auth:password-reset-requested', async (payload) => {
        logger.info('Password reset requested', { email: payload.email });
        otpStore.set(payload.email.toLowerCase(), { otp: payload.otp, expiresAt: payload.expiresAt });

        const subject = 'Password Reset Code';

        try {
            await mailService.send({
                to: payload.email,
                subject,
                template: 'password-reset',
                context: {
                    otp: payload.otp,
                    fullName: payload.name,
                    expiresInMinutes: config.auth.otpExpiresMinutes,
                },
            });
            addMailLog({
                from: config.mail.from,
                to: payload.email,
                subject,
                html: `Password reset OTP email (templated) sent to ${payload.email}`,
                status: 'reset_requested',
                otp: payload.otp,
            });
            await notificationService.createNotification({
                userId: payload.userId,
                title: 'Password Reset Requested',
                message: 'A password reset was requested for your account.',
                type: NOTIFICATION_TYPES.INFO,
                adminMessage: 'User requested a password reset',
                metadata: { email: payload.email },
            });
        } catch (err) {
            logger.error('Failed to send password reset email', { error: err });
        }
    });

    bus.on<OtpPayload>('auth:otp-resend', async (payload) => {
        // Determine if this is a first send or a resend before updating the store
        const isResend = otpStore.has(payload.email.toLowerCase());
        logger.info('OTP resent', { email: payload.email, otp: payload.otp });
        otpStore.set(payload.email.toLowerCase(), { otp: payload.otp, expiresAt: payload.expiresAt });

        const subject = 'Your OTP Code';

        try {
            await mailService.send({
                to: payload.email,
                subject,
                template: 'otp',
                context: {
                    otp: payload.otp,
                    fullName: payload.name,
                    expiresInMinutes: config.auth.otpExpiresMinutes,
                },
            });
            addMailLog({
                from: config.mail.from,
                to: payload.email,
                subject,
                html: `OTP email (templated) sent to ${payload.email}`,
                status: isResend ? 'otp_resent' : 'otp_sent',
                otp: payload.otp,
            });
        } catch (err) {
            logger.error('Failed to send OTP email', { error: err });
        }
    });

    bus.on<UserPayload>('auth:password-reset', async (payload) => {
        logger.info('Password reset completed', { email: payload.email });
    });

    bus.on<UserPayload>('auth:email-verified', async (payload) => {
        logger.info('Email verified', { email: payload.email, name: payload.name });
        otpStore.delete(payload.email.toLowerCase());
        markEmailVerified(payload.email);

        try {
            await mailService.send({
                to: payload.email,
                subject: `Welcome to ${config.app.name}!`,
                template: 'welcome',
                context: {
                    fullName: payload.name,
                    email: payload.email,
                    createdAt: new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    }),
                },
            });
        } catch (err) {
            logger.error('Failed to send welcome email', { error: err });
        }
    });

    bus.on<UserPayload>('user:registered', async (payload) => {
        logger.info('User registered', { email: payload.email, name: payload.name, userId: payload.userId });
    });
};
