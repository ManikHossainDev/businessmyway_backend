import type { Document, Types } from 'mongoose';

import type { NotificationType } from './notification.constants';

export interface INotification {
    userId: Types.ObjectId;
    title: string;
    message: string;
    type: NotificationType;
    isRead: boolean;
    adminMessage?: string;
    readAt?: Date;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface INotificationDocument extends INotification, Document {
    id: string;
}

export interface CreateNotificationInput {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    adminMessage?: string;
    metadata?: Record<string, unknown>;
}
