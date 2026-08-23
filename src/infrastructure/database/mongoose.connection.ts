import mongoose from 'mongoose';

import { config } from '@/config';
import { logger } from '../logger/winston.logger';

const createAbortError = (): Error => {
    const error = new Error('Operation aborted.');
    error.name = 'AbortError';
    return error;
};

const withAbort = async <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (!signal) {
        return promise;
    }

    if (signal.aborted) {
        throw createAbortError();
    }

    return new Promise<T>((resolve, reject) => {
        const abortHandler = (): void => reject(createAbortError());
        signal.addEventListener('abort', abortHandler, { once: true });

        promise
            .then(resolve)
            .catch(reject)
            .finally(() => {
                signal.removeEventListener('abort', abortHandler);
            });
    });
};

let listenersRegistered = false;

const registerConnectionListeners = (): void => {
    if (listenersRegistered) {
        return;
    }

    listenersRegistered = true;
    mongoose.connection.on('error', (error) => {
        logger.error('MongoDB runtime error', { error: error.message });
    });

    mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
    });
};

export const connectDatabase = async (signal?: AbortSignal): Promise<void> => {
    await withAbort(
        mongoose.connect(config.db.uri, {
            autoIndex: !config.isProduction,
            minPoolSize: config.db.minPoolSize,
            maxPoolSize: config.db.maxPoolSize,
            serverSelectionTimeoutMS: config.db.serverSelectionTimeoutMs,
            socketTimeoutMS: config.db.socketTimeoutMs,
        }),
        signal,
    );

    registerConnectionListeners();
    await unsetRemovedUserFields();
    logger.info('MongoDB connected successfully');
};

const REMOVED_USER_FIELDS = {
    currentLevelId: 1,
    lifetimeQualifiedSales: 1,
    lifetimeQualifiedOrders: 1,
    totalCommissionEarned: 1,
    walletId: 1,
};

const unsetRemovedUserFields = async (): Promise<void> => {
    const db = mongoose.connection.db;
    if (!db) {
        return;
    }

    const result = await db.collection('users').updateMany({}, { $unset: REMOVED_USER_FIELDS });
    if (result.modifiedCount > 0) {
        logger.info('Removed leftover user fields from MongoDB', {
            modifiedCount: result.modifiedCount,
        });
    }
};

export const disconnectDatabase = async (): Promise<void> => {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
};
