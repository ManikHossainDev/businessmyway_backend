import { env } from './env';

const corsOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const config = {
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test',

    app: {
        port: env.PORT,
        apiPrefix: env.API_PREFIX,
        clientUrl: env.CLIENT_URL,
        corsOrigins,
        requestTimeoutMs: env.REQUEST_TIMEOUT_MS,
        shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS,
        name: env.APP_NAME,
    },

    auth: {
        maxFailedAttempts: env.AUTH_MAX_FAILED_ATTEMPTS,
        lockDurationMinutes: env.AUTH_LOCK_DURATION_MINUTES,
        otpExpiresMinutes: env.OTP_EXPIRES_MINUTES,
    },

    db: {
        uri: env.MONGODB_URI,
        minPoolSize: env.MONGODB_MIN_POOL_SIZE,
        maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
        serverSelectionTimeoutMs: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
        socketTimeoutMs: env.MONGODB_SOCKET_TIMEOUT_MS,
    },

    redis: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        db: env.REDIS_DB,
        password: env.REDIS_PASSWORD || undefined,
        connectTimeoutMs: env.REDIS_CONNECT_TIMEOUT_MS,
        keepAliveMs: env.REDIS_KEEP_ALIVE_MS,
        commandTimeoutMs: env.REDIS_COMMAND_TIMEOUT_MS,
    },

    jwt: {
        accessSecret: env.JWT_ACCESS_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        accessExpiry: env.JWT_ACCESS_TOKEN_EXPIRY,
        refreshExpiry: env.JWT_REFRESH_TOKEN_EXPIRY,
        verifyEmailExpirationHours: env.JWT_VERIFY_EMAIL_EXPIRATION_HOURS,
        resetPasswordExpirationHours: env.JWT_RESET_PASSWORD_EXPIRATION_HOURS,
    },

    oauth: {
        google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            callbackUrl: env.GOOGLE_CALLBACK_URL,
        },
        facebook: {
            appId: env.FACEBOOK_APP_ID,
            appSecret: env.FACEBOOK_APP_SECRET,
            callbackUrl: env.FACEBOOK_CALLBACK_URL,
        },
        apple: {
            clientId: env.APPLE_CLIENT_ID,
        },
    },

    mail: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
        from: `drft<${env.MAIL_FROM}>`,
    },

    cloudinary: {
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        apiKey: env.CLOUDINARY_API_KEY,
        apiSecret: env.CLOUDINARY_API_SECRET,
    },

    stripe: {
        secretKey: env.STRIPE_SECRET_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
        currency: env.STRIPE_CURRENCY,
    },

    realtime: {
        path: env.SOCKET_IO_PATH,
        pingIntervalMs: env.SOCKET_IO_PING_INTERVAL_MS,
        pingTimeoutMs: env.SOCKET_IO_PING_TIMEOUT_MS,
        connectTimeoutMs: env.SOCKET_IO_CONNECT_TIMEOUT_MS,
        maxPayloadBytes: env.SOCKET_IO_MAX_PAYLOAD_BYTES,
        messageRateLimitPerMinute: env.SOCKET_IO_MESSAGE_RATE_LIMIT_PER_MINUTE,
        chatMaxMessageLength: env.SOCKET_IO_CHAT_MAX_MESSAGE_LENGTH,
        useRedisAdapter: env.SOCKET_IO_USE_REDIS_ADAPTER === 'true',
    },

    firebase: {
        configPath: env.FIREBASE_CONFIG_PATH,
    },

    aws: {
        endpoint: env.AWS_ENDPOINT,
        region: env.AWS_REGION,
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        s3Bucket: env.AWS_S3_BUCKET,
        sesFromEmail: env.AWS_SES_FROM_EMAIL,
    },

    storage: {
        mode: env.STORAGE_MODE as 'local' | 's3' | 'cloudinary',
    },

    serverBaseUrl: env.SERVER_BASE_URL,

    accountExpires: env.ACCOUNT_EXPIRES, 
} as const;
