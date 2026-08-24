import type { Document } from 'mongoose';

export interface ISubscriber {
    email: string;
    agreed: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ISubscriberDocument extends ISubscriber, Document {
    id: string;
}
