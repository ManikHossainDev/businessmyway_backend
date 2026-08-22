# Backend — Complete Project Documentation

> **App Name:** DRFT  
> **Stack:** Node.js · Express 5 · TypeScript · MongoDB (Mongoose) · Redis · Socket.IO · BullMQ

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Directory Structure](#2-directory-structure)
3. [Prerequisites](#3-prerequisites)
4. [Environment Variables](#4-environment-variables)
5. [Running the Project](#5-running-the-project)
   - [Docker (Recommended)](#51-docker-recommended)
   - [Local Without Docker](#52-local-without-docker)
   - [Production Build](#53-production-build)
6. [Database Seeding](#6-database-seeding)
7. [Architecture Overview](#7-architecture-overview)
8. [Path Aliases](#8-path-aliases)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [API Reference](#10-api-reference)
    - [Health](#101-health)
    - [Auth](#102-auth)
    - [Users](#103-users)
    - [Claims](#104-claims)
    - [Subscriptions / Plans](#105-subscriptions--plans)
    - [Payments](#106-payments)
    - [Notifications](#107-notifications)
    - [Settings & Contact](#108-settings--contact)
    - [File Upload](#109-file-upload)
    - [Admin — Dashboard](#1010-admin--dashboard)
    - [Admin — Users](#1011-admin--users)
    - [Admin — Claims](#1012-admin--claims)
    - [Admin — Plans](#1013-admin--plans)
    - [Admin — Settings](#1014-admin--settings)
    - [Admin — Notifications](#1015-admin--notifications)
    - [Dev (Development Only)](#1016-dev-development-only)
11. [Database Models](#11-database-models)
12. [Middleware Reference](#12-middleware-reference)
13. [Real-time (Socket.IO)](#13-real-time-socketio)
14. [File Storage](#14-file-storage)
15. [Email System](#15-email-system)
16. [Push Notifications (Firebase)](#16-push-notifications-firebase)
17. [Background Jobs (BullMQ)](#17-background-jobs-bullmq)
18. [Docker Services](#18-docker-services)
19. [NPM Scripts](#19-npm-scripts)
20. [Testing](#20-testing)
21. [Key File Index](#21-key-file-index)

---

## 1. Project Overview

This is a production-ready Express 5 + TypeScript backend template powering the **DRFT** application. It includes:

- JWT authentication with refresh-token rotation
- Role-based access control (user / admin)
- MongoDB via Mongoose with pagination & text search
- Redis caching + BullMQ job queues
- Socket.IO real-time with Redis adapter
- File uploads — local / S3 / Cloudinary (switchable via env)
- Email via SMTP or AWS SES (EJS templates)
- Firebase Cloud Messaging push notifications
- Stripe payments & subscriptions
- Zod-validated environment & request bodies
- Winston logging, Morgan HTTP logs, global error handler
- Docker Compose dev environment (Mongo, Redis, MailHog, Mongo Express)

---

## 2. Directory Structure

```
Backend/
├── src/
│   ├── server.ts                  # Entry point — starts HTTP server
│   ├── app.ts                     # Express app, global middleware
│   ├── routes/
│   │   └── v1.ts                  # Composes all module routes under /api/v1
│   ├── config/
│   │   ├── index.ts               # Aggregated config object
│   │   └── env.ts                 # Zod env validation
│   ├── core/
│   │   ├── constants/             # App-wide constants
│   │   ├── errors/                # Custom error classes
│   │   └── types/                 # Shared TypeScript types
│   ├── infrastructure/
│   │   ├── database/              # Mongoose connection
│   │   ├── cache/                 # Redis connection
│   │   ├── mail/                  # Mail service (SMTP / SES)
│   │   ├── storage/               # File storage (local / S3 / Cloudinary)
│   │   ├── realtime/              # Socket.IO server setup
│   │   ├── push-notification/     # Firebase FCM
│   │   └── health/                # Health check service
│   ├── modules/                   # Feature modules (each has model/service/controller/routes)
│   │   ├── auth/
│   │   ├── user/
│   │   ├── claims/
│   │   ├── subscriptions/
│   │   ├── payments/
│   │   ├── notification/
│   │   ├── settings/
│   │   ├── home/
│   │   └── dev/
│   ├── shared/
│   │   └── middlewares/           # authenticate, authorize, validate, upload, etc.
│   ├── seeds/                     # DB seed scripts
│   └── jobs/                      # BullMQ background jobs
├── docker/
│   ├── Dockerfile                 # Production multi-stage build
│   ├── Dockerfile.dev             # Development build
│   └── nginx/                     # Nginx reverse proxy config
├── templates/                     # EJS email templates
├── tests/                         # Jest test suite
├── docs/                          # Architecture decision records
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── nodemon.json
├── jest.config.ts
└── .env.example
```

---

## 3. Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Node.js | 20+ (24 recommended) | LTS |
| npm | 10+ | |
| MongoDB | 7 | Not needed if using Docker |
| Redis | 7 | Not needed if using Docker |
| Docker + Docker Compose | Latest | For the easiest setup |

---

## 4. Environment Variables

Copy `.env.example` to `.env` and fill in values before starting.

### Core App

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `development` / `production` / `test` |
| `PORT` | `5000` | HTTP server port |
| `API_PREFIX` | `/api/v1` | Base path for all routes |
| `APP_NAME` | `DRFT` | App name used in emails/logs |
| `CLIENT_URL` | `http://localhost:3000` | Frontend URL |
| `CORS_ORIGIN` | _(comma-separated)_ | Allowed CORS origins |
| `REQUEST_TIMEOUT_MS` | `15000` | Per-request timeout |
| `SHUTDOWN_TIMEOUT_MS` | `10000` | Graceful shutdown wait time |

### MongoDB

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/backend_template` | Connection string |
| `MONGODB_MIN_POOL_SIZE` | `5` | Min connection pool |
| `MONGODB_MAX_POOL_SIZE` | `20` | Max connection pool |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | `5000` | Server selection timeout |
| `MONGODB_SOCKET_TIMEOUT_MS` | `45000` | Socket timeout |

### Redis

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_DB` | `0` | Redis DB index |
| `REDIS_PASSWORD` | _(empty)_ | Redis password |
| `REDIS_CONNECT_TIMEOUT_MS` | `5000` | Connection timeout |
| `REDIS_KEEP_ALIVE_MS` | `30000` | Keep-alive interval |
| `REDIS_COMMAND_TIMEOUT_MS` | `2000` | Command execution timeout |

### JWT

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_ACCESS_SECRET` | _(required)_ | Min 32 chars (64 in prod) |
| `JWT_REFRESH_SECRET` | _(required)_ | Min 32 chars (64 in prod) |
| `JWT_ACCESS_EXPIRATION_MINUTES` | `15` | Access token lifespan |
| `JWT_REFRESH_EXPIRATION_DAYS` | `7` | Refresh token lifespan |
| `JWT_VERIFY_EMAIL_EXPIRATION_HOURS` | `24` | Email verification token lifespan |
| `JWT_RESET_PASSWORD_EXPIRATION_HOURS` | `1` | Password reset token lifespan |

### Email / SMTP

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | `localhost` | SMTP server host |
| `SMTP_PORT` | `1025` | SMTP port (1025 = MailHog) |
| `SMTP_USER` | _(empty)_ | SMTP username |
| `SMTP_PASS` | _(empty)_ | SMTP password |
| `MAIL_FROM` | `noreply@example.com` | Sender address |

### File Storage

| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_MODE` | `local` | `local` / `s3` / `cloudinary` |
| `CLOUDINARY_CLOUD_NAME` | _(optional)_ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | _(optional)_ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | _(optional)_ | Cloudinary API secret |
| `AWS_ENDPOINT` | `http://localhost:4566` | LocalStack endpoint (dev only) |
| `AWS_REGION` | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | `test` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | `test` | AWS secret key |
| `AWS_S3_BUCKET` | `drft-uploads` | S3 bucket name |
| `AWS_SES_FROM_EMAIL` | `noreply@drft.app` | SES sender email |

### Auth Security

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_MAX_FAILED_ATTEMPTS` | `10` | Login attempts before lockout |
| `AUTH_LOCK_DURATION_MINUTES` | `60` | Lockout duration |

### Stripe

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

### Firebase

| Variable | Default | Description |
|----------|---------|-------------|
| `FIREBASE_CONFIG_PATH` | `./src/config/your-firebase-config.json` | Path to Firebase service account JSON |

### Socket.IO

| Variable | Default | Description |
|----------|---------|-------------|
| `SOCKET_IO_PATH` | `/socket.io` | Socket.IO mount path |
| `SOCKET_IO_PING_INTERVAL_MS` | `25000` | Ping interval |
| `SOCKET_IO_PING_TIMEOUT_MS` | `20000` | Ping timeout |
| `SOCKET_IO_USE_REDIS_ADAPTER` | `true` | Enable Redis adapter for scaling |
| `SOCKET_IO_MESSAGE_RATE_LIMIT_PER_MINUTE` | `120` | Per-socket rate limit |

### Super Admin Seed

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPER_ADMIN_NAME` | `Super Admin` | Admin display name |
| `SUPER_ADMIN_EMAIL` | `superadmin@example.com` | Admin login email |
| `SUPER_ADMIN_PASSWORD` | `ChangeMe@12345` | Admin initial password |

---

## 5. Running the Project

### 5.1 Docker (Recommended)

```bash
# 1. Copy and fill environment variables
cp .env.example .env

# 2. Start all services (API + MongoDB + Redis + MailHog + Mongo Express)
npm run docker:up
# OR
docker compose up --build

# 3. Stop all services
npm run docker:down

# 4. Stop and remove all data volumes
npm run docker:down:volumes
```

**Services started by Docker:**

| Service | URL | Notes |
|---------|-----|-------|
| API | http://localhost:5000 | Main backend |
| MongoDB | localhost:27017 | Database |
| Mongo Express | http://localhost:8081 | DB admin UI (admin / admin123) |
| Redis | localhost:6379 | Cache & queue |
| MailHog | http://localhost:8025 | Email testing UI |

### 5.2 Local Without Docker

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment variables
cp .env.example .env
# Make sure MongoDB and Redis are running locally

# 3. Seed the database
npm run seed:all

# 4. Start development server (with hot reload)
npm run dev
```

The server will be available at `http://localhost:5000`.

### 5.3 Production Build

```bash
# Build TypeScript and start
npm run start:prod

# Or step by step:
npm run build   # Compiles TS to dist/
npm run start   # Runs dist/src/server.js
```

---

## 6. Database Seeding

Run these after the server/database is up:

```bash
# Seed everything at once
npm run seed:all

# Or individually:
npm run seed:admin     # Create super admin user
npm run seed:plans     # Create subscription plans
npm run seed:settings  # Create default settings (privacy policy, terms, etc.)
```

Seed credentials come from env vars (`SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`).

---

## 7. Architecture Overview

```
HTTP Request
     ↓
Express App (app.ts)
     ↓ security headers · rate limit · CORS · request ID
Routes (src/routes/v1.ts)
     ↓ authenticate · authorize · validate
Controllers (src/modules/*/controller.ts)
     ↓ parse request · call service · return response
Services (src/modules/*/service.ts)
     ↓ business logic
Repositories (src/modules/*/repository.ts)
     ↓ DB queries via Mongoose
Models (src/modules/*/model.ts)
     ↓
MongoDB
```

Each feature module (e.g. `auth`, `claims`) owns its own:
- `*.model.ts` — Mongoose schema
- `*.repository.ts` — data access
- `*.service.ts` — business logic
- `*.controller.ts` — HTTP adapter
- `*.routes.ts` — route definitions
- `*.validation.ts` — Zod schemas

---

## 8. Path Aliases

Defined in `tsconfig.json`. Use these instead of relative imports:

| Alias | Maps to |
|-------|---------|
| `@/*` | `src/*` |
| `@config/*` | `src/config/*` |
| `@core/*` | `src/core/*` |
| `@infra/*` | `src/infrastructure/*` |
| `@shared/*` | `src/shared/*` |
| `@modules/*` | `src/modules/*` |
| `@jobs/*` | `src/jobs/*` |
| `@tests/*` | `tests/*` |

---

## 9. Authentication & Authorization

### Token Flow

```
POST /auth/register or /auth/login
         ↓ returns
{ accessToken, refreshToken }

Every protected request:
Authorization: Bearer <accessToken>

When accessToken expires (15 min):
POST /auth/refresh-token  { refreshToken }
         ↓ returns
{ accessToken, refreshToken }  ← old refresh token is blacklisted

Logout:
POST /auth/logout  { refreshToken }
         ↓ blacklists the token in DB
```

### JWT Payload

```json
{
  "sub": "<userId>",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user | admin",
  "status": "active | pending | inactive | deleted",
  "isEmailVerified": true,
  "onboardingStep": "profile",
  "isOnboardingCompleted": false,
  "registrationStrategy": "local | google | facebook | apple",
  "type": "ACCESS | REFRESH",
  "jti": "<uuid>",
  "iat": 1700000000,
  "exp": 1700000900
}
```

### Middleware

| Middleware | How to use | Description |
|-----------|-----------|-------------|
| `authenticate` | Apply to protected routes | Validates Bearer token, sets `req.user` |
| `optionalAuth` | Apply where auth is optional | Sets `req.user` if token present, does not error |
| `authorize('admin')` | Apply after `authenticate` | Checks `req.user.role` |

### Security Features

- Bcrypt password hashing
- Refresh token stored as **hash** in DB (not plaintext)
- Blacklisted tokens checked on refresh/logout
- Account lockout after `AUTH_MAX_FAILED_ATTEMPTS` failed logins
- Lockout duration: `AUTH_LOCK_DURATION_MINUTES`

---

## 10. API Reference

**Base URL:** `http://localhost:5000/api/v1`

All protected routes require:
```
Authorization: Bearer <accessToken>
```

---

### 10.1 Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Basic server health |
| GET | `/api/v1/health` | No | Full health check (DB, Redis, etc.) |

---

### 10.2 Auth

Base path: `/api/v1/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register with email + password |
| POST | `/auth/login` | No | Login — returns `accessToken` + `refreshToken` |
| POST | `/auth/refresh-token` | No | Exchange refresh token for new token pair |
| POST | `/auth/logout` | No | Blacklist refresh token |
| GET | `/auth/me` | Yes | Get current user profile |
| POST | `/auth/forgot-password` | No | Send password reset email with OTP |
| POST | `/auth/verify-reset-code` | No | Verify OTP from reset email |
| POST | `/auth/resend-otp` | No | Resend email verification OTP |
| POST | `/auth/verify-email` | No | Verify email address with token |
| POST | `/auth/change-password` | Yes | Change password (requires current password) |
| POST | `/auth/reset-password` | Yes | Reset password after OTP verified |
| POST | `/auth/complete-profile` | Yes | Submit profile info + media (multipart/form-data) |

---

### 10.3 Users

Base path: `/api/v1/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | Yes | Get authenticated user details |
| PATCH | `/users/me` | Yes | Update profile — supports avatar upload (multipart) |
| DELETE | `/users/me` | Yes | Soft-delete user account |

---

### 10.4 Claims

Base path: `/api/v1/claims`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/claims/` | Yes | List all claims (pagination + filtering) |
| GET | `/claims/my` | Yes | List the authenticated user's claims |
| GET | `/claims/stats` | Yes | Claim statistics summary |
| GET | `/claims/:id` | Yes | Get single claim by ID |
| POST | `/claims/` | Yes | Create a new claim — supports image/video upload (multipart) |

**Claim statuses:** `under_review` → `approved` / `rejected`

---

### 10.5 Subscriptions / Plans

Base path: `/api/v1/subscriptions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/subscriptions/` | No | List active plans |
| GET | `/subscriptions/all` | No | List all plans (including inactive) |
| GET | `/subscriptions/:id` | No | Get plan details |
| POST | `/subscriptions/purchase` | Yes | Purchase a plan (Stripe) |

---

### 10.6 Payments

Base path: `/api/v1/payments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/payments/` | Yes | List authenticated user's payments (paginated) |
| GET | `/payments/:id` | Yes | Get single payment details |

---

### 10.7 Notifications

Base path: `/api/v1/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications/` | Yes | List notifications (paginated) |
| GET | `/notifications/unread-count` | Yes | Get count of unread notifications |
| PATCH | `/notifications/:id/read` | Yes | Mark one notification as read |
| PATCH | `/notifications/read-all` | Yes | Mark all as read |
| POST | `/notifications/` | Yes | Create a notification |
| POST | `/notifications/test-broadcast-push` | Yes | Send a test push notification |
| POST | `/notifications/broadcast` | Yes | Broadcast to all users |

---

### 10.8 Settings & Contact

Base path: `/api/v1/settings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/settings/public/:slug` | No | Get a public setting by slug |
| POST | `/settings/contact` | No | Submit a contact form |

**Available slugs:** `privacy_policy` / `terms_and_conditions` / `about_us`

---

### 10.9 File Upload

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/upload` | Yes | Upload a single file — returns `{ url, publicId }` |

Uses `multipart/form-data`. The actual storage destination (local / S3 / Cloudinary) is set by `STORAGE_MODE` env var.

---

### 10.10 Admin — Dashboard

Base path: `/api/v1/admin/dashboard`  
All admin routes require `authenticate` + `authorize('admin')`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/dashboard/stats` | Admin | Overview statistics |
| GET | `/admin/dashboard/monthly-earnings` | Admin | Monthly earnings report |

---

### 10.11 Admin — Users

Base path: `/api/v1/admin/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/users/active` | Admin | List active users |
| GET | `/admin/users/pending` | Admin | List pending users |
| PATCH | `/admin/users/:id/approve` | Admin | Approve a user |
| PATCH | `/admin/users/:id/reject` | Admin | Reject a user |

---

### 10.12 Admin — Claims

Base path: `/api/v1/admin/claims`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/claims/` | Admin | List all claims |
| PATCH | `/admin/claims/:id/approve` | Admin | Approve a claim |
| PATCH | `/admin/claims/:id/reject` | Admin | Reject a claim (with reason) |

---

### 10.13 Admin — Plans

Base path: `/api/v1/admin/plans`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/plans/` | Admin | List all subscription plans |
| POST | `/admin/plans/` | Admin | Create a new plan |
| PATCH | `/admin/plans/:id` | Admin | Update a plan |
| DELETE | `/admin/plans/:id` | Admin | Delete a plan |
| PATCH | `/admin/plans/:id/toggle-active` | Admin | Enable / disable a plan |

---

### 10.14 Admin — Settings

Base path: `/api/v1/admin/settings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/settings/` | Admin | List all settings |
| GET | `/admin/settings/contacts` | Admin | List contact form submissions |
| GET | `/admin/settings/:slug` | Admin | Get a setting by slug |
| PUT | `/admin/settings/:slug` | Admin | Update a setting |

---

### 10.15 Admin — Notifications

Base path: `/api/v1/admin/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/notifications/` | Admin | List all notifications |
| POST | `/admin/notifications/broadcast` | Admin | Broadcast notification to all users |

---

### 10.16 Dev (Development Only)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/dev/otp` | No | Retrieve last OTP (only available in `NODE_ENV=development`) |

---

## 11. Database Models

### User

Collection: `users`

| Field | Type | Notes |
|-------|------|-------|
| `email` | String | Unique (partial index, `isDeleted: false`) |
| `name` | String | |
| `password` | String | Bcrypt hashed, `select: false` |
| `role` | Enum | `user` / `admin` |
| `status` | Enum | `active` / `pending` / `inactive` / `deleted` |
| `isEmailVerified` | Boolean | |
| `avatarUrl` | String | |
| `propertyImages` | String[] | Max 10 images |
| `propertyVideos` | String[] | |
| `subscriptionId` | ObjectId → Subscription | |
| `planStatus` | Enum | |
| `planExpiresAt` | Date | |
| `onboardingStep` | String | |
| `isOnboardingCompleted` | Boolean | |
| `failedLoginAttempts` | Number | For lockout tracking |
| `lockUntil` | Date | Lockout expiry |
| `notificationToken` | String | FCM device token |
| `deviceType` | Enum | `android` / `ios` / `web` |
| `registrationStrategy` | Enum | `local` / `google` / `facebook` / `apple` |
| `termsAcceptedAt` | Date | |
| `isDeleted` | Boolean | Soft delete flag |
| `timestamps` | auto | `createdAt`, `updatedAt` |

### Claim

Collection: `claims`

| Field | Type | Notes |
|-------|------|-------|
| `customId` | String | Unique human-readable ID |
| `userId` | ObjectId → User | |
| `title` | String | |
| `description` | String | |
| `date` | Date | |
| `location` | String | |
| `comments` | String | |
| `media.images` | String[] | Uploaded image URLs |
| `media.videos` | String[] | Uploaded video URLs |
| `status` | Enum | `under_review` / `approved` / `rejected` |
| `reviewedBy` | ObjectId → User | Admin who reviewed |
| `reviewedAt` | Date | |
| `rejectionReason` | String | |
| `timestamps` | auto | |

### Subscription (Plan)

| Field | Type | Notes |
|-------|------|-------|
| `title` | String | Plan name |
| `description` | String | |
| `priceMonthly` | Number | |
| `priceYearly` | Number | |
| `currency` | String | |
| `stripePriceIdMonthly` | String | Stripe price ID |
| `stripePriceIdYearly` | String | Stripe price ID |
| `features` | String[] | Feature list |
| `benefits` | String[] | Benefits list |
| `isActive` | Boolean | |
| `sortOrder` | Number | Display order |

### Payment

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId → User | |
| `subscriptionId` | ObjectId → Subscription | |
| `invoiceId` | String | Unique |
| `title` | String | |
| `amount` | Number | |
| `currency` | String | |
| `billingType` | Enum | `monthly` / `yearly` |
| `stripeSessionId` | String | |
| `stripePaymentIntentId` | String | |
| `status` | Enum | `completed` / `pending` / `failed` |
| `paidAt` | Date | |

### Token

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId → User | |
| `tokenHash` | String | Hashed token value |
| `type` | Enum | `REFRESH` / `VERIFY_EMAIL` / `RESET_PASSWORD` |
| `expiresAt` | Date | TTL index — auto-deleted |
| `blacklisted` | Boolean | |

### Notification

| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId → User | |
| `title` | String | |
| `message` | String | |
| `type` | String | Notification category |
| `isRead` | Boolean | |
| `readAt` | Date | |
| `metadata` | Mixed | Extra data |

### Setting

| Field | Type | Notes |
|-------|------|-------|
| `slug` | Enum | `privacy_policy` / `terms_and_conditions` / `about_us`  |
| `title` | String | |
| `content` | String | Rich text content |
| `isPublic` | Boolean | Whether accessible without auth |

### Contact

| Field | Type | Notes |
|-------|------|-------|
| `name` | String | |
| `email` | String | |
| `subject` | String | |
| `message` | String | |

---

## 12. Middleware Reference

Location: [src/shared/middlewares/](src/shared/middlewares/)

| Middleware | File | Purpose |
|-----------|------|---------|
| `authenticate` | `authenticate.ts` | Validates Bearer JWT, sets `req.user` |
| `optionalAuth` | `authenticate.ts` | Same but does not error if no token |
| `authorize(role)` | `authorize.ts` | Checks `req.user.role` against required role |
| `validate(schema)` | `validate.ts` | Zod validation for body / params / query |
| `upload` | `upload.ts` | Multer — handles `single`, `array`, `fields` |
| `setUploadDir` | `upload.ts` | Sets subdirectory for local uploads |
| `parseMultipartData` | `upload.ts` | Parses multipart form fields into `req.body` |
| `requestId` | `requestId.ts` | Attaches unique UUID to every request |
| `requestContext` | `requestContext.ts` | AsyncLocalStorage for context propagation |
| `rateLimiter` | `rateLimiter.ts` | 120 req/min (prod), 1000 req/min (dev) |
| `idempotency` | `idempotency.ts` | Prevents duplicate mutations via `Idempotency-Key` header |
| `httpLogger` | `httpLogger.ts` | Morgan HTTP request logging |
| `globalErrorHandler` | `globalErrorHandler.ts` | Catches all thrown errors, returns structured JSON |
| `notFound` | `notFound.ts` | 404 fallback handler |
| `requestTimeout` | `requestTimeout.ts` | Aborts request after `REQUEST_TIMEOUT_MS` |

**Security middleware applied globally in `app.ts`:**
- Helmet (sets secure HTTP headers)
- HPP (HTTP parameter pollution protection)
- CORS (configured origins)
- Compression (gzip)
- Cookie parser

---

## 13. Real-time (Socket.IO)

**Setup:** [src/infrastructure/realtime/socket.server.ts](src/infrastructure/realtime/socket.server.ts)

- Mounts at path defined by `SOCKET_IO_PATH` (default `/socket.io`)
- Redis adapter enabled via `SOCKET_IO_USE_REDIS_ADAPTER=true` (required for multi-instance scaling)
- Per-socket rate limit: `SOCKET_IO_MESSAGE_RATE_LIMIT_PER_MINUTE`
- Max message size: `SOCKET_IO_MAX_PAYLOAD_BYTES` (1 MB default)

**Client connection:**
```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  path: '/socket.io',
  auth: { token: '<accessToken>' },
  transports: ['websocket'],
});
```

---

## 14. File Storage

Controlled by `STORAGE_MODE` env var.

| Mode | Description | Required Env Vars |
|------|-------------|------------------|
| `local` | Saves to `uploads/` directory in project | None |
| `s3` | Uploads to AWS S3 (or LocalStack in dev) | `AWS_*` vars |
| `cloudinary` | Uploads to Cloudinary CDN | `CLOUDINARY_*` vars |

All three modes return the same response shape: `{ url, publicId }`.

**Upload endpoints:** `PATCH /users/me`, `POST /claims/`, `POST /auth/complete-profile`, `POST /upload`

---

## 15. Email System

Location: [src/infrastructure/mail/](src/infrastructure/mail/)

- **Driver:** SMTP (default) or AWS SES (`STORAGE_MODE` not relevant here — uses `AWS_SES_FROM_EMAIL` to detect)
- **Templates:** EJS files in [templates/](templates/)
- **Dev testing:** MailHog at http://localhost:8025 catches all outgoing emails

**Emails sent:**
- Email verification (after register)
- Password reset OTP
- Welcome email (after profile complete)

---

## 16. Push Notifications (Firebase)

Location: [src/infrastructure/push-notification/firebase.service.ts](src/infrastructure/push-notification/firebase.service.ts)

- Lazy-initialized — only activates when `FIREBASE_CONFIG_PATH` is set and the file exists
- Supports Android (high priority) and iOS (APNS) notification formats
- Device token stored in `User.notificationToken`
- Test endpoint: `POST /api/v1/notifications/test-broadcast-push`

**Setup:**
1. Download `serviceAccountKey.json` from Firebase Console → Project Settings → Service Accounts
2. Save it at the path specified in `FIREBASE_CONFIG_PATH`

---

## 17. Background Jobs (BullMQ)

Location: [src/jobs/](src/jobs/)

- Built on BullMQ backed by Redis
- Used for: email sending, notification delivery, and other async tasks
- BullMQ connection gracefully closed on server shutdown

---

## 18. Docker Services

Defined in [docker-compose.yml](docker-compose.yml):

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `api` | Node 24-alpine | 5000 | Backend API (hot reload) |
| `mongo` | mongo:7 | 27017 | Primary database |
| `mongo-express` | mongo-express:1.0.2 | 8081 | Mongo admin UI |
| `redis` | redis:7-alpine | 6379 | Cache + BullMQ + Socket adapter |
| `mailhog` | mailhog/mailhog | 1025 (SMTP), 8025 (UI) | Email capture in dev |

**Mongo Express default credentials:** `admin` / `admin123`

**Production Dockerfile** ([docker/Dockerfile](docker/Dockerfile)): multi-stage build, non-root user, minimal Alpine image.

---

## 19. NPM Scripts

| Script | Command | When to Use |
|--------|---------|------------|
| `dev` | `nodemon` | Local development with hot reload |
| `build` | `tsc && tsc-alias` | Compile TS to `dist/` |
| `start` | `node dist/src/server.js` | Run compiled build |
| `start:prod` | build + start | One-command production run |
| `docker:up` | `docker compose up --build` | Start Docker dev stack |
| `docker:down` | `docker compose down` | Stop Docker containers |
| `docker:down:volumes` | `docker compose down -v` | Stop + wipe all volumes |
| `docker:prod` | `docker compose --profile prod up` | Production Docker build |
| `seed:admin` | ts-node seed | Create super admin |
| `seed:plans` | ts-node seed | Seed subscription plans |
| `seed:settings` | ts-node seed | Seed settings documents |
| `seed:all` | runs all seeds | Initialize fresh DB |
| `typecheck` | `tsc --noEmit` | Check types without building |
| `lint` | `eslint .` | Run ESLint |
| `lint:fix` | `eslint . --fix` | Auto-fix lint issues |
| `format` | `prettier . --write` | Format all files |
| `test` | `jest --runInBand` | Run all tests sequentially |
| `test:watch` | `jest --watch` | Run tests in watch mode |

---

## 20. Testing

- **Framework:** Jest + ts-jest
- **Config:** [jest.config.ts](jest.config.ts)
- **Test files:** [tests/](tests/)
- Tests run sequentially (`--runInBand`) to avoid DB connection conflicts

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode during development
```

---

## 21. Key File Index

| Category | File | Purpose |
|----------|------|---------|
| Entry point | [src/server.ts](src/server.ts) | Starts HTTP server, connects DB/Redis, sets up Socket.IO |
| Express setup | [src/app.ts](src/app.ts) | Global middleware, route mounting, error handlers |
| Route composition | [src/routes/v1.ts](src/routes/v1.ts) | Mounts all module routes under `/api/v1` |
| Config object | [src/config/index.ts](src/config/index.ts) | Aggregates all config values |
| Env validation | [src/config/env.ts](src/config/env.ts) | Zod schema — app crashes early on invalid env |
| Auth routes | [src/modules/auth/auth.routes.ts](src/modules/auth/auth.routes.ts) | All auth endpoints |
| Auth service | [src/modules/auth/auth.service.ts](src/modules/auth/auth.service.ts) | JWT, refresh, OAuth, lockout logic |
| Auth middleware | [src/shared/middlewares/authenticate.ts](src/shared/middlewares/authenticate.ts) | JWT verification |
| Error handler | [src/shared/middlewares/globalErrorHandler.ts](src/shared/middlewares/globalErrorHandler.ts) | Centralized error → JSON response |
| DB connection | [src/infrastructure/database/mongoose.connection.ts](src/infrastructure/database/mongoose.connection.ts) | MongoDB connect/disconnect |
| Redis connection | [src/infrastructure/cache/](src/infrastructure/cache/) | Redis client setup |
| Mail service | [src/infrastructure/mail/mail.service.ts](src/infrastructure/mail/mail.service.ts) | Send emails via SMTP or SES |
| Socket.IO | [src/infrastructure/realtime/socket.server.ts](src/infrastructure/realtime/socket.server.ts) | Real-time layer |
| Firebase | [src/infrastructure/push-notification/firebase.service.ts](src/infrastructure/push-notification/firebase.service.ts) | FCM push notifications |
| Storage | [src/infrastructure/storage/index.ts](src/infrastructure/storage/index.ts) | Local / S3 / Cloudinary abstraction |
| Health check | [src/infrastructure/health/health.service.ts](src/infrastructure/health/health.service.ts) | DB + Redis health probe |
| Docker compose | [docker-compose.yml](docker-compose.yml) | Local dev environment |
| Prod Dockerfile | [docker/Dockerfile](docker/Dockerfile) | Multi-stage production image |
| Email templates | [templates/](templates/) | EJS email templates |
| Architecture docs | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layer boundaries, module flow |
| Contributing guide | [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Setup, workflow, delivery checklist |
| Conventions | [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | Naming and structure rules |
