import type { Document } from 'mongoose';

export interface IContact {
    name: string;
    email: string;
    subject: string;
    message: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IContactDocument extends IContact, Document {
    id: string;
}
