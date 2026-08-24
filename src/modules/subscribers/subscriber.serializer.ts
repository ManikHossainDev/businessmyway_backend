import type { ISubscriber } from './subscriber.interface';

export type SubscriberUserInfo = {
    name: string;
    phone: string;
    avatar: string;
} | null;

export const serializeSubscriber = (
    subscriber: (ISubscriber & { id?: string; _id?: unknown }) | null,
    user: SubscriberUserInfo = null,
) => {
    if (!subscriber) return null;

    return {
        id: subscriber.id || String(subscriber._id || ''),
        email: subscriber.email,
        agreed: subscriber.agreed,
        name: user?.name || '',
        phone: user?.phone || '',
        avatar: user?.avatar || '',
        createdAt: subscriber.createdAt,
        updatedAt: subscriber.updatedAt,
    };
};
