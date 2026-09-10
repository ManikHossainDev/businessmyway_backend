import mongoose, { Schema, Document } from 'mongoose';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';

export interface IChatMessageDocument extends Document {
    id: string;
    conversationId: mongoose.Types.ObjectId;
    sender: {
        id: string;
        email: string;
        name?: string;
        role?: string;
        avatarUrl?: string;
    };
    message: string;
    attachments?: Array<{
        url: string;
        type: string;
        mimeType: string;
        size: number;
        name?: string;
    }>;
    clientMessageId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessageDocument>(
    {
        conversationId: {
            type: Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
            index: true,
        },
        sender: {
            id: { type: String, required: true, index: true },
            email: { type: String, required: true },
            name: { type: String },
            role: { type: String },
            avatarUrl: { type: String },
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000,
        },
        attachments: [
            {
                url: { type: String, required: true },
                type: { type: String, default: 'file' },
                mimeType: { type: String },
                size: { type: Number },
                name: { type: String },
            },
        ],
        clientMessageId: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
        collection: 'chat_messages',
    },
);

chatMessageSchema.index({ conversationId: 1, createdAt: 1 });
chatMessageSchema.plugin(toJSONPlugin);

export const ChatMessageModel = mongoose.model<IChatMessageDocument>(
    'ChatMessage',
    chatMessageSchema,
);
