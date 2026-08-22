import path from 'path';
import hpp from 'hpp';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express, { type RequestHandler } from 'express';
import type { Request } from 'express';

import apiV1Routes from '@/routes/v1';
import { config } from '@config/index';
import { catchAsync } from '@shared/utils/catchAsync';
import { notFound } from '@shared/middlewares/notFound';
import { HTTP_STATUS } from '@core/constants/httpStatus';
import { requestId } from '@shared/middlewares/requestId';
import { sendResponse } from '@shared/utils/sendResponse';
import { HealthService } from '@infra/health/health.service';
import { httpLogger } from '@infra/logger/morgan.middleware';
import { idempotency } from '@shared/middlewares/idempotency';
import { renderLandingPage } from '@shared/utils/landingPage';
import { requestContext } from '@shared/middlewares/requestContext';
import { globalRateLimiter } from '@shared/middlewares/rateLimiter';
import { LOGO_DIRECTORY, UPLOAD_DIRECTORY } from '@/infrastructure/storage/local-storage';
import { globalErrorHandler } from '@shared/middlewares/globalErrorHandler';

interface ExtendedRequest extends Request {
    abortController?: AbortController;
}

const requestTimeout: RequestHandler = (req, res, next) => {
    const controller = new AbortController();
    (req as ExtendedRequest).abortController = controller;

    const timeout = setTimeout(() => {
        controller.abort();
    }, config.app.requestTimeoutMs);

    res.on('close', () => clearTimeout(timeout));
    res.on('finish', () => clearTimeout(timeout));

    next();
};

const app = express();
const healthService = new HealthService();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(requestId);
app.use(requestContext);
app.use(requestTimeout);
app.use(httpLogger);
// app.use(helmet());
app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: "cross-origin",
        },
    })
);
app.use(hpp());
app.use(
    cors({
        origin: config.app.corsOrigins,
        credentials: true,
    }),
);
app.use(compression());
app.use(globalRateLimiter);
app.use(idempotency());
app.use(
    "/uploads",
    (req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader(
            "Cross-Origin-Resource-Policy",
            "cross-origin"
        );
        next();
    },
    express.static(UPLOAD_DIRECTORY)
);
app.use('/logo', express.static(LOGO_DIRECTORY));
// Raw body required for Stripe webhook signature verification — must be before express.json()
app.use(`${config.app.apiPrefix}/stripe/webhook`, express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// EJS view engine for public payment pages
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../templates/views'));

app.get('/', (_req, res) => {
    const page = renderLandingPage({
        name: config.app.name,
        apiPrefix: config.app.apiPrefix,
        realtimePath: config.realtime.path,
        env: config.env,
        timestamp: new Date().toISOString(),
        uptimeSeconds: process.uptime(),
    });
    res.status(HTTP_STATUS.OK).type('html').send(page);
});

app.get(
    '/health',
    catchAsync(async (req, res) => {
        const signal = (req as ExtendedRequest).abortController?.signal;
        const report = await healthService.check(signal);
        const statusCode =
            report.status === 'down' ? HTTP_STATUS.SERVICE_UNAVAILABLE : HTTP_STATUS.OK;

        return sendResponse(res, {
            statusCode,
            message: 'Health report fetched successfully.',
            data: {
                ...report,
                uptimeSeconds: Number(process.uptime().toFixed(2)),
                environment: config.env,
            },
        });
    }),
);

app.use(config.app.apiPrefix, apiV1Routes);
app.use(notFound);
app.use(globalErrorHandler);

export { app };
