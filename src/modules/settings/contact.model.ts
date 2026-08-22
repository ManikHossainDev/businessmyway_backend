import mongoose, { Schema } from 'mongoose';
import type { IContactDocument } from './contact.interface';

const contactSchema = new Schema<IContactDocument>(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: 100,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            trim: true,
            lowercase: true,
        },
        subject: {
            type: String,
            required: [true, 'Subject is required'],
            trim: true,
            maxlength: 200,
        },
        message: {
            type: String,
            required: [true, 'Message is required'],
            trim: true,
            maxlength: 2000,
        },
    },
    {
        timestamps: true,
        versionKey: false,
        collection: 'contacts',
    },
);

export const ContactModel = mongoose.model<IContactDocument>('Contact', contactSchema);
