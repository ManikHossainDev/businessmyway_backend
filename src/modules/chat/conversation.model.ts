import mongoose, { Schema, Document } from 'mongoose';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';

export interface IConversationDocument extends Document {
    id: string;
    participants: mongoose.Types.ObjectId[];
    lastMessage?: {
        message: string;
        sender: mongoose.Types.ObjectId;
        sentAt: Date;
    };
    unreadCounts?: Map<string, number>;
    createdAt: Date;
    updatedAt: Date;
}

const conversationSchema = new Schema<IConversationDocument>(
    {
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
                index: true,
            },
        ],
        lastMessage: {
            message: { type: String, trim: true },
            sender: { type: Schema.Types.ObjectId, ref: 'User' },
            sentAt: { type: Date },
        },
        unreadCounts: {
            type: Map,
            of: Number,
            default: {},
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
        collection: 'conversations',
    },
);

conversationSchema.plugin(toJSONPlugin);

export const ConversationModel = mongoose.model<IConversationDocument>(
    'Conversation',
    conversationSchema,
);
