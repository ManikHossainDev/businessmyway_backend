import mongoose from 'mongoose';
import type { Server, Socket } from 'socket.io';
import { ROLES } from '@core/constants/roles';
import { logger } from '../logger/winston.logger';
import { getUserRoom, getChatRoom } from './socket.types';
import type {
    ChatMessageEvent,
    ChatMessagePayload,
    ChatRoomPayload,
    ChatStartPayload,
    ChatHistoryPayload,
    ClientToServerEvents,
    InterServerEvents,
    RealtimeAckHandler,
    RealtimeSocketData,
    ServerToClientEvents,
} from './socket.types';
import { chatService } from '@/modules/chat/chat.service';
import { emitNotificationCreated } from './socket.gateway';

type RealtimeServer = Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    RealtimeSocketData
>;
type RealtimeSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    RealtimeSocketData
>;

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 120;

// Global online user tracking: Map<userId, Set<socketId>>
const onlineUserSockets = new Map<string, Set<string>>();

const getOnlineUserIds = (): string[] => Array.from(onlineUserSockets.keys());

const checkRateLimit = (socket: RealtimeSocket): boolean => {
    const now = Date.now();
    const rateLimit = socket.data.chatRateLimit ?? {
        windowStartedAtMs: now,
        requestCount: 0,
    };

    if (now - rateLimit.windowStartedAtMs > RATE_LIMIT_WINDOW_MS) {
        rateLimit.windowStartedAtMs = now;
        rateLimit.requestCount = 0;
    }

    rateLimit.requestCount += 1;
    socket.data.chatRateLimit = rateLimit;

    return rateLimit.requestCount <= MAX_REQUESTS_PER_WINDOW;
};

export const registerRealtimeHandlers = (io: RealtimeServer): void => {
    io.on('connection', (socket) => {
        const user = socket.data.user;
        const userIdStr = String(user.id);
        const userRoom = getUserRoom(user.id);

        // Track socket connection for user presence
        const userSockets = onlineUserSockets.get(userIdStr) || new Set<string>();
        const wasOffline = userSockets.size === 0;
        userSockets.add(socket.id);
        onlineUserSockets.set(userIdStr, userSockets);

        void socket.join(userRoom);

        // Send current connected info including online users
        socket.emit('system:connected', {
            socketId: socket.id,
            connectedAt: new Date().toISOString(),
            user,
            onlineUserIds: getOnlineUserIds(),
        });

        socket.emit('presence:initial', {
            onlineUserIds: getOnlineUserIds(),
        });

        // If user just transitioned to online, broadcast to others
        if (wasOffline) {
            socket.broadcast.emit('presence:update', {
                userId: userIdStr,
                isOnline: true,
            });
        }

        logger.info('Realtime client connected', { socketId: socket.id, userId: user.id });

        // Handler to get current online list
        socket.on('presence:list', (ack?: (res: any) => void) => {
            ack?.({ ok: true, data: { onlineUserIds: getOnlineUserIds() } });
        });

        // 1. chat:start -> user starts/resumes support chat or admin starts/fetches conversations
        socket.on('chat:start', async (payload?: ChatStartPayload, ack?: (res: any) => void) => {
            try {
                const currentOnlineIds = getOnlineUserIds();
                if (user.role === ROLES.SUPER_ADMIN) {
                    if (payload?.targetUserId) {
                        const conversation = await chatService.startAdminUserConversation(
                            user,
                            payload.targetUserId,
                        );
                        void socket.join(getChatRoom(conversation.id));
                        ack?.({ ok: true, data: { conversation, onlineUserIds: currentOnlineIds } });
                        return;
                    }
                    const conversations = await chatService.getConversations(user);
                    ack?.({ ok: true, data: { conversations, onlineUserIds: currentOnlineIds } });
                    return;
                }

                const conversation = await chatService.startUserSupportConversation(user);
                void socket.join(getChatRoom(conversation.id));
                ack?.({ ok: true, data: { conversation, onlineUserIds: currentOnlineIds } });
            } catch (error: any) {
                logger.error('Error starting chat conversation', { error: error.message, userId: user.id });
                ack?.({ ok: false, message: error.message || 'Failed to start chat' });
            }
        });

        // 2. chat:join -> join a specific chat room
        socket.on('chat:join', (payload: ChatRoomPayload, ack?: RealtimeAckHandler) => {
            try {
                if (!payload?.roomId) {
                    ack?.({ ok: false, message: 'Room ID is required' });
                    return;
                }

                const chatRoom = getChatRoom(payload.roomId);
                void socket.join(chatRoom);

                socket.to(chatRoom).emit('chat:user-joined', {
                    roomId: payload.roomId,
                    userId: user.id,
                    occurredAt: new Date().toISOString(),
                });

                ack?.({ ok: true });
            } catch (error: any) {
                logger.error('Error joining chat room', { error: error.message, roomId: payload?.roomId });
                ack?.({ ok: false, message: 'Failed to join chat room' });
            }
        });

        // 3. chat:leave -> leave a specific chat room
        socket.on('chat:leave', (payload: ChatRoomPayload, ack?: RealtimeAckHandler) => {
            try {
                if (!payload?.roomId) {
                    ack?.({ ok: false, message: 'Room ID is required' });
                    return;
                }

                const chatRoom = getChatRoom(payload.roomId);
                void socket.leave(chatRoom);

                socket.to(chatRoom).emit('chat:user-left', {
                    roomId: payload.roomId,
                    userId: user.id,
                    occurredAt: new Date().toISOString(),
                });

                ack?.({ ok: true });
            } catch (error: any) {
                logger.error('Error leaving chat room', { error: error.message, roomId: payload?.roomId });
                ack?.({ ok: false, message: 'Failed to leave chat room' });
            }
        });

        // 4. chat:history -> retrieve past messages
        socket.on('chat:history', async (payload: ChatHistoryPayload, ack?: (res: any) => void) => {
            try {
                const targetId = payload?.conversationId || payload?.roomId;
                if (!targetId) {
                    ack?.({ ok: false, message: 'Conversation ID is required' });
                    return;
                }

                if (mongoose.Types.ObjectId.isValid(targetId)) {
                    const messages = await chatService.getConversationHistory(
                        targetId,
                        user,
                        payload?.limit || 100,
                    );
                    ack?.({ ok: true, data: { messages } });
                    return;
                }

                ack?.({ ok: true, data: { messages: [] } });
            } catch (error: any) {
                logger.error('Error retrieving chat history', { error: error.message, targetId: payload });
                ack?.({ ok: false, message: error.message || 'Failed to get history' });
            }
        });

        // 5. chat:message -> dispatch and save message
        socket.on('chat:message', async (payload: ChatMessagePayload, ack?: RealtimeAckHandler) => {
            try {
                if (!checkRateLimit(socket)) {
                    ack?.({ ok: false, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many messages sent' });
                    return;
                }

                if (!payload?.roomId || !payload?.message || !payload.message.trim()) {
                    ack?.({ ok: false, message: 'Room ID and message are required' });
                    return;
                }

                const trimmedMessage = payload.message.trim();
                let messageEvent: ChatMessageEvent;

                if (mongoose.Types.ObjectId.isValid(payload.roomId)) {
                    const result = await chatService.saveAndDispatchMessage(
                        payload.roomId,
                        user,
                        trimmedMessage,
                        payload.clientMessageId,
                    );
                    messageEvent = result.messageEvent;

                    // Broadcast to chat room
                    const chatRoom = getChatRoom(payload.roomId);
                    io.to(chatRoom).emit('chat:message', messageEvent);

                    // Notify recipient
                    if (result.recipientId) {
                        emitNotificationCreated(result.recipientId, {
                            id: `msg-${messageEvent.messageId}`,
                            title: `New message from ${user.name || user.email}`,
                            message: trimmedMessage.length > 60 ? `${trimmedMessage.slice(0, 60)}…` : trimmedMessage,
                            type: 'chat_message',
                            isRead: false,
                            createdAt: new Date(),
                            metadata: { conversationId: payload.roomId },
                        });
                    }
                } else {
                    // Fallback for non-ObjectID rooms (like test general-room)
                    messageEvent = {
                        roomId: payload.roomId,
                        messageId: `msg-${Date.now()}`,
                        message: trimmedMessage,
                        text: trimmedMessage,
                        sender: {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            avatarUrl: user.avatarUrl,
                        },
                        clientMessageId: payload.clientMessageId,
                        sentAt: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                    };
                    io.to(getChatRoom(payload.roomId)).emit('chat:message', messageEvent);
                }

                ack?.({ ok: true, data: { messageId: messageEvent.messageId } });
            } catch (error: any) {
                logger.error('Error handling chat:message', { error: error.message, roomId: payload?.roomId });
                ack?.({ ok: false, message: error.message || 'Failed to send message' });
            }
        });

        socket.on('disconnect', (reason) => {
            const userSockets = onlineUserSockets.get(userIdStr);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    onlineUserSockets.delete(userIdStr);
                    io.emit('presence:update', {
                        userId: userIdStr,
                        isOnline: false,
                    });
                }
            }
            logger.info('Realtime client disconnected', { socketId: socket.id, userId: user.id, reason });
        });
    });
};
