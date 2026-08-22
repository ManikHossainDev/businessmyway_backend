export const NOTIFICATION_TYPES = {
    CLAIM_APPROVED: 'claim_approved',
    CLAIM_REJECTED: 'claim_rejected',
    CLAIM_SUBMITTED: 'claim_submitted',
    PAYMENT_SUCCESSFUL: 'payment_successful',
    RENEWAL_REMINDER: 'renewal_reminder',
    PROFILE_APPROVED: 'profile_approved',
    PROFILE_REJECTED: 'profile_rejected',
    ADMIN_NEW_USER: 'admin_new_user',
    ADMIN_NEW_CLAIM: 'admin_new_claim',
    INFO: 'info',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
