import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, InterServerEvents, RealtimeSocketData, ServerToClientEvents } from './socket.types';
import { logger } from '../logger/winston.logger';
import { UserModel } from '@/modules/user/user.model';
import { getUserRoom } from './socket.types';

type RealtimeServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, RealtimeSocketData>;
type RealtimeSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, RealtimeSocketData>;

export const registerRealtimeHandlers = (io: RealtimeServer): void => {
    io.on('connection', (socket) => {
        const user = socket.data.user;
        const userRoom = getUserRoom(user.id);

        void socket.join(userRoom);
        socket.emit('system:connected', {
            socketId: socket.id,
            connectedAt: new Date().toISOString(),
            user,
        });

        logger.info('Realtime client connected', { socketId: socket.id, userId: user.id });

        socket.on('disconnect', (reason) => {
            logger.info('Realtime client disconnected', { socketId: socket.id, userId: user.id, reason });
        });
    });
};
