import mongoose from 'mongoose';
import { ROLES } from '@core/constants/roles';
import { UserModel } from '@/modules/user/user.model';
import { ConversationModel, type IConversationDocument } from './conversation.model';
import { ChatMessageModel, type IChatMessageDocument } from './message.model';
import type { ChatMessageEvent, RealtimeSocketUser } from '@/infrastructure/realtime/socket.types';
import { logger } from '@/infrastructure/logger/winston.logger';

export interface FormattedConversation {
    id: string;
    participants: Array<{
        id: string;
        name: string;
        email: string;
        avatar?: string;
        role?: string;
    }>;
    partner: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
        role?: string;
    };
    lastMessage?: {
        message: string;
        senderId: string;
        sentAt: string;
    };
    createdAt: string;
    updatedAt: string;
}

export class ChatService {
    private formatConversation(
        conv: any,
        currentUserId: string,
    ): FormattedConversation {
        const participants = (conv.participants || []).map((p: any) => ({
            id: p._id ? p._id.toString() : p.toString(),
            name:
                p.name && !p.name.includes('@')
                    ? p.name
                    : p.role === ROLES.SUPER_ADMIN
                    ? 'Support Admin'
                    : 'Customer',
            email: p.email || '',
            avatar: p.avatar || '',
            role: p.role || '',
        }));

        const partner = participants.find((p: any) => p.id !== currentUserId) ||
            participants[0] || {
                id: '',
                name: 'Support Admin',
                email: '',
                role: ROLES.SUPER_ADMIN,
            };

        return {
            id: conv._id ? conv._id.toString() : conv.id,
            participants,
            partner,
            lastMessage: conv.lastMessage?.message
                ? {
                      message: conv.lastMessage.message,
                      senderId: conv.lastMessage.sender?.toString() || '',
                      sentAt: conv.lastMessage.sentAt
                          ? new Date(conv.lastMessage.sentAt).toISOString()
                          : new Date().toISOString(),
                  }
                : undefined,
            createdAt: conv.createdAt ? new Date(conv.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: conv.updatedAt ? new Date(conv.updatedAt).toISOString() : new Date().toISOString(),
        };
    }

    async getSuperAdminUser() {
        const superAdmin = await UserModel.findOne({
            role: ROLES.SUPER_ADMIN,
            isDeleted: { $ne: true },
        }).lean();

        if (superAdmin) return superAdmin;

        // Fallback to any superAdmin if status was different
        return await UserModel.findOne({ role: ROLES.SUPER_ADMIN }).lean();
    }

    async startUserSupportConversation(user: RealtimeSocketUser): Promise<FormattedConversation> {
        const userObjectId = new mongoose.Types.ObjectId(user.id);

        // 1. Check if user already has an existing conversation
        let conversation = await ConversationModel.findOne({
            participants: userObjectId,
        })
            .sort({ updatedAt: -1 })
            .populate('participants', 'name email avatar role');

        if (!conversation) {
            const superAdmin = await this.getSuperAdminUser();
            if (!superAdmin) {
                throw new Error('Support is currently offline. Please try again later.');
            }

            const adminObjectId = new mongoose.Types.ObjectId(superAdmin._id.toString());
            const created = await ConversationModel.create({
                participants: [userObjectId, adminObjectId],
            });
            conversation = await ConversationModel.findById(created._id).populate(
                'participants',
                'name email avatar role',
            );
        }

        return this.formatConversation(conversation, user.id);
    }

    async startAdminUserConversation(
        admin: RealtimeSocketUser,
        targetUserId: string,
    ): Promise<FormattedConversation> {
        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            throw new Error('Invalid user ID');
        }

        const targetUser = await UserModel.findById(targetUserId).lean();
        if (!targetUser) {
            throw new Error('User not found');
        }

        const userObjectId = new mongoose.Types.ObjectId(targetUserId);

        // 1. Check if a conversation already exists for this target user
        let conversation = await ConversationModel.findOne({
            participants: userObjectId,
        })
            .sort({ updatedAt: -1 })
            .populate('participants', 'name email avatar role');

        if (!conversation) {
            const adminObjectId = new mongoose.Types.ObjectId(admin.id);
            const created = await ConversationModel.create({
                participants: [adminObjectId, userObjectId],
            });
            conversation = await ConversationModel.findById(created._id).populate(
                'participants',
                'name email avatar role',
            );
        }

        return this.formatConversation(conversation, admin.id);
    }

    async getConversations(user: RealtimeSocketUser): Promise<FormattedConversation[]> {
        const userObjectId = new mongoose.Types.ObjectId(user.id);
        const conversations = await ConversationModel.find({
            participants: userObjectId,
        })
            .populate('participants', 'name email avatar role')
            .sort({ updatedAt: -1 })
            .lean();

        const formatted = conversations.map((conv) => this.formatConversation(conv, user.id));

        // Deduplicate so each partner appears strictly once in the conversation list
        const seenPartnerIds = new Set<string>();
        const uniqueConversations: FormattedConversation[] = [];

        for (const conv of formatted) {
            const partnerId = conv.partner.id;
            if (partnerId && !seenPartnerIds.has(partnerId)) {
                seenPartnerIds.add(partnerId);
                uniqueConversations.push(conv);
            } else if (!partnerId) {
                uniqueConversations.push(conv);
            }
        }

        return uniqueConversations;
    }

    async getConversationHistory(
        conversationId: string,
        user: RealtimeSocketUser,
        limit = 100,
    ): Promise<ChatMessageEvent[]> {
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            throw new Error('Invalid conversation ID');
        }

        const conversation = await ConversationModel.findById(conversationId).lean();
        if (!conversation) {
            throw new Error('Conversation not found');
        }

        const isParticipant = conversation.participants.some(
            (p) => p.toString() === user.id,
        );
        const isAdmin = user.role === ROLES.SUPER_ADMIN;

        if (!isParticipant && !isAdmin) {
            throw new Error('Unauthorized to view this conversation');
        }

        const messages = await ChatMessageModel.find({
            conversationId: new mongoose.Types.ObjectId(conversationId),
        })
            .sort({ createdAt: 1 })
            .limit(limit)
            .lean();

        return messages.map((m) => ({
            roomId: conversationId,
            messageId: m._id.toString(),
            message: m.message,
            text: m.message,
            sender: {
                id: m.sender.id,
                email: m.sender.email,
                name:
                    m.sender.name && !m.sender.name.includes('@')
                        ? m.sender.name
                        : m.sender.role === ROLES.SUPER_ADMIN
                        ? 'Support Admin'
                        : 'Customer',
                avatarUrl: m.sender.avatarUrl,
            },
            attachments: m.attachments,
            clientMessageId: m.clientMessageId,
            sentAt: m.createdAt.toISOString(),
            createdAt: m.createdAt.toISOString(),
        }));
    }

    async saveAndDispatchMessage(
        conversationId: string,
        sender: RealtimeSocketUser,
        messageText: string,
        clientMessageId?: string,
    ): Promise<{
        messageEvent: ChatMessageEvent;
        recipientId: string | null;
    }> {
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            throw new Error('Invalid conversation ID');
        }

        const conversation = await ConversationModel.findById(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }

        const isParticipant = conversation.participants.some(
            (p) => p.toString() === sender.id,
        );
        const isAdmin = sender.role === ROLES.SUPER_ADMIN;

        if (!isParticipant && !isAdmin) {
            throw new Error('Unauthorized to send message in this conversation');
        }

        const senderDisplayName =
            sender.name && !sender.name.includes('@')
                ? sender.name
                : sender.role === ROLES.SUPER_ADMIN
                ? 'Support Admin'
                : 'Customer';

        const senderObjectId = new mongoose.Types.ObjectId(sender.id);
        const messageDoc = await ChatMessageModel.create({
            conversationId: conversation._id,
            sender: {
                id: sender.id,
                email: sender.email,
                name: senderDisplayName,
                role: sender.role,
                avatarUrl: sender.avatarUrl,
            },
            message: messageText.trim(),
            clientMessageId,
        });

        conversation.lastMessage = {
            message: messageText.trim(),
            sender: senderObjectId,
            sentAt: new Date(),
        };
        await conversation.save();

        const recipientObjectId = conversation.participants.find(
            (p) => p.toString() !== sender.id,
        );
        const recipientId = recipientObjectId ? recipientObjectId.toString() : null;

        const messageEvent: ChatMessageEvent = {
            roomId: conversationId,
            messageId: messageDoc._id.toString(),
            message: messageDoc.message,
            text: messageDoc.message,
            sender: {
                id: sender.id,
                email: sender.email,
                name: senderDisplayName,
                avatarUrl: sender.avatarUrl,
            },
            clientMessageId,
            sentAt: messageDoc.createdAt.toISOString(),
            createdAt: messageDoc.createdAt.toISOString(),
        };

        return { messageEvent, recipientId };
    }
}

export const chatService = new ChatService();
