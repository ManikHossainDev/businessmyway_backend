process.env.NODE_ENV = 'test';

import { disconnectRedis } from '../src/infrastructure/cache/redis.client';
import { disconnectDatabase } from '../src/infrastructure/database/mongoose.connection';
import { closeBullConnection } from '../src/infrastructure/queue/bull.connection';
import { closeRealtimeServer } from '../src/infrastructure/realtime';
process.env.PORT = process.env.PORT ?? '5001';
process.env.API_PREFIX = process.env.API_PREFIX ?? '/api/v1';
process.env.CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:3000';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
process.env.REQUEST_TIMEOUT_MS = process.env.REQUEST_TIMEOUT_MS ?? '5000';
process.env.SHUTDOWN_TIMEOUT_MS = process.env.SHUTDOWN_TIMEOUT_MS ?? '5000';

process.env.MONGODB_URI =
    process.env.MONGODB_URI ?? 'mongodb://localhost:27017/backend_template_test';
process.env.MONGODB_MIN_POOL_SIZE = process.env.MONGODB_MIN_POOL_SIZE ?? '1';
process.env.MONGODB_MAX_POOL_SIZE = process.env.MONGODB_MAX_POOL_SIZE ?? '5';
process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS =
    process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? '2000';
process.env.MONGODB_SOCKET_TIMEOUT_MS = process.env.MONGODB_SOCKET_TIMEOUT_MS ?? '5000';

process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';
process.env.REDIS_DB = process.env.REDIS_DB ?? '0';
process.env.REDIS_PASSWORD = process.env.REDIS_PASSWORD ?? '';
process.env.REDIS_CONNECT_TIMEOUT_MS = process.env.REDIS_CONNECT_TIMEOUT_MS ?? '1000';
process.env.REDIS_KEEP_ALIVE_MS = process.env.REDIS_KEEP_ALIVE_MS ?? '1000';
process.env.REDIS_COMMAND_TIMEOUT_MS = process.env.REDIS_COMMAND_TIMEOUT_MS ?? '500';

process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-test-access-secret-123456';
process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-test-refresh-secret-1234';
process.env.JWT_ACCESS_EXPIRATION_MINUTES = process.env.JWT_ACCESS_EXPIRATION_MINUTES ?? '15';
process.env.JWT_REFRESH_EXPIRATION_DAYS = process.env.JWT_REFRESH_EXPIRATION_DAYS ?? '7';
process.env.JWT_VERIFY_EMAIL_EXPIRATION_HOURS =
    process.env.JWT_VERIFY_EMAIL_EXPIRATION_HOURS ?? '24';
process.env.JWT_RESET_PASSWORD_EXPIRATION_HOURS =
    process.env.JWT_RESET_PASSWORD_EXPIRATION_HOURS ?? '1';

process.env.SMTP_HOST = process.env.SMTP_HOST ?? 'localhost';
process.env.SMTP_PORT = process.env.SMTP_PORT ?? '1025';
process.env.SMTP_USER = process.env.SMTP_USER ?? '';
process.env.SMTP_PASS = process.env.SMTP_PASS ?? '';
process.env.MAIL_FROM = process.env.MAIL_FROM ?? 'noreply@app.dev';

process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL ?? '';
process.env.FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID ?? '';
process.env.FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET ?? '';
process.env.FACEBOOK_CALLBACK_URL = process.env.FACEBOOK_CALLBACK_URL ?? '';

process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? '';
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY ?? '';
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET ?? '';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    jest.restoreAllMocks();
});

afterAll(async () => {
    await Promise.allSettled([
        closeRealtimeServer(),
        closeBullConnection(),
        disconnectRedis(),
        disconnectDatabase(),
    ]);
});
