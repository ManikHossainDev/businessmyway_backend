import IORedis from 'ioredis';

import { config } from '@/config';
import { logger } from '../logger/winston.logger';

export const bullRedisConnection = new IORedis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: true,
    lazyConnect: true,
    retryStrategy: (attempts) => {
        if (config.isTest || attempts > 3) {
            return null;
        }
        return Math.min(500 * attempts, 2000);
    },
});

bullRedisConnection.on('connect', () => {
    logger.info('BullMQ Redis connecting');
});

bullRedisConnection.on('ready', () => {
    logger.info('BullMQ Redis ready');
});

bullRedisConnection.on('error', (error) => {
    logger.error('BullMQ Redis error', { error: error.message || error.name || String(error) });
});

export const closeBullConnection = async (): Promise<void> => {
    if (bullRedisConnection.status === 'end' || bullRedisConnection.status === 'wait') {
        return;
    }

    try {
        if (bullRedisConnection.status === 'ready' || bullRedisConnection.status === 'connect') {
            await bullRedisConnection.quit();
            return;
        }
        
        await new Promise<void>((resolve) => {
            bullRedisConnection.once('end', resolve);
            bullRedisConnection.disconnect(false);
        });
    } catch {
        await new Promise<void>((resolve) => {
            bullRedisConnection.once('end', resolve);
            bullRedisConnection.disconnect(false);
        });
    }
};
