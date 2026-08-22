import { logger } from '../../logger/winston.logger';
import type { IEventBus } from '@/core/interfaces/event-bus.interface';
import { notificationService } from '@/modules/notification/notification.service';
import { NOTIFICATION_TYPES } from '@/modules/notification/notification.constants';
import { mailService } from '@/infrastructure/mail/mail.service';
import { enqueuePushNotification } from '@/infrastructure/queue/push-notification.queue';
import { config } from '@/config';

interface UserProfilePayload {
    userId: string;
    email: string;
    name: string;
    reason?: string;
}

export const registerUserListeners = (bus: IEventBus): void => {
    bus.on<UserProfilePayload>('user:profile-approved', async (payload) => {
        logger.info('User profile approved', { email: payload.email, userId: payload.userId });
        try {
            await notificationService.createNotification({
                userId: payload.userId,
                title: 'Profile Approved',
                message: 'Your profile has been approved! You can now start using all features.',
                type: NOTIFICATION_TYPES.PROFILE_APPROVED,
                adminMessage: 'User profile has been approved by admin',
                metadata: { email: payload.email },
            });
        } catch (err) {
            logger.error('Failed to create profile approved notification', { error: err });
        }

        try {
            await mailService.send({
                to: payload.email,
                subject: `Your ${config.app.name} profile is approved`,
                template: 'profile-approved',
                context: { fullName: payload.name },
            });
        } catch (err) {
            logger.error('Failed to send profile approved email', { error: err });
        }

        try {
            await enqueuePushNotification({
                userId: payload.userId,
                title: 'Profile Approved',
                body: 'Your profile has been approved. You can now start using all features.',
                data: { type: 'profile_approved' },
            });
        } catch (err) {
            logger.error('Failed to enqueue profile approved push', { error: err });
        }
    });

    bus.on<UserProfilePayload>('user:profile-rejected', async (payload) => {
        logger.info('User profile rejected', { email: payload.email, userId: payload.userId });

        const rejectionMessage = payload.reason
            ? `Your profile was not approved. Reason: ${payload.reason}. Please update your information and resubmit.`
            : 'Your profile was not approved. Please update your information and resubmit.';

        try {
            await notificationService.createNotification({
                userId: payload.userId,
                title: 'Profile Rejected',
                message: rejectionMessage,
                type: NOTIFICATION_TYPES.PROFILE_REJECTED,
                adminMessage: 'User profile was rejected — requires user resubmission',
                metadata: { email: payload.email, reason: payload.reason },
            });
        } catch (err) {
            logger.error('Failed to create profile rejected notification', { error: err });
        }

        try {
            await mailService.send({
                to: payload.email,
                subject: `Action needed on your ${config.app.name} profile`,
                template: 'profile-rejected',
                context: { fullName: payload.name, reason: payload.reason },
            });
        } catch (err) {
            logger.error('Failed to send profile rejected email', { error: err });
        }

        try {
            await enqueuePushNotification({
                userId: payload.userId,
                title: 'Profile Update Needed',
                body: payload.reason
                    ? `Your profile needs an update: ${payload.reason}`
                    : 'Your profile was not approved. Please update your information and resubmit.',
                data: { type: 'profile_rejected' },
            });
        } catch (err) {
            logger.error('Failed to enqueue profile rejected push', { error: err });
        }
    });
};
