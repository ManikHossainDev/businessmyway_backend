# Authentication System — Complete Developer Reference

> **Audience:** Developers onboarding to the DRFT backend who need to understand how the entire authentication lifecycle works without reading every source file first.
>
> **Stack:** Node.js · Express · TypeScript · MongoDB (Mongoose) · Redis · JWT · Bcrypt · Nodemailer · Zod · EventEmitter

---

## Table of Contents

1. [Authentication Overview](#1-authentication-overview)
2. [Registration Flow](#2-registration-flow)
3. [Email Verification Flow](#3-email-verification-flow)
4. [Resend OTP Flow](#4-resend-otp-flow)
5. [Login Flow](#5-login-flow)
6. [Social Login Flow](#6-social-login-flow)
7. [Refresh Token Flow](#7-refresh-token-flow)
8. [Forgot Password Flow](#8-forgot-password-flow)
9. [Verify Reset Code Flow](#9-verify-reset-code-flow)
10. [Reset Password Flow](#10-reset-password-flow)
11. [Change Password Flow](#11-change-password-flow)
12. [Complete Profile Flow](#12-complete-profile-flow)
13. [Utility Functions Mapping](#13-utility-functions-mapping)
14. [Route → Controller → Service → Utils Mapping](#14-route--controller--service--utils-mapping)
15. [Database Collections Used](#15-database-collections-used)
16. [Authentication Flow Summary](#16-authentication-flow-summary)

---

## 1. Authentication Overview

### Architecture

The authentication system is split across four layers:

```
HTTP Request
    │
    ▼
Middleware (validate → authenticate → authorize)
    │
    ▼
Controller  (src/modules/auth/auth.controller.ts)
    │
    ▼
Service     (src/modules/auth/auth.service.ts)
    │
    ├──► Repository  (src/modules/user/user.repository.ts)
    ├──► Repository  (src/modules/token/token.repository.ts)
    └──► EventBus    (src/infrastructure/events/event-bus.ts)
                         │
                         ▼
                     Listeners  (src/infrastructure/events/listeners/auth.listeners.ts)
                         │
                         └──► MailTransport (src/infrastructure/mail/mail.transport.ts)
```

**Key design decisions:**
- Email sending is **fire-and-forget** via an in-memory event bus. A failed email never breaks the main API response.
- Tokens (refresh, OTP, reset codes) are **never stored as plain text** in the database. Every token is SHA-256 hashed before being persisted.
- Account lockout and brute-force protection live entirely inside `AuthService`.

---

### Access Token & Refresh Token Strategy

| Property | Access Token | Refresh Token |
|---|---|---|
| Secret | `JWT_ACCESS_SECRET` | `JWT_REFRESH_SECRET` |
| Default expiry | 15 minutes (`JWT_ACCESS_EXPIRATION_MINUTES`) | 7 days (`JWT_REFRESH_EXPIRATION_DAYS`) |
| Stored in DB? | No | Yes (SHA-256 hash only) |
| Payload field `type` | `"access"` | `"refresh"` |
| Used for | Authorizing API calls | Obtaining a new access token |
| Revokable? | No (short-lived) | Yes (blacklisted in DB) |

Every JWT payload includes a `jti` (UUID v4) unique identifier and a `type` claim. The middleware rejects any token whose `type` does not match the expected value — so a refresh token can never be used as an access token.

**JWT Payload shape** (`src/modules/auth/strategies/jwt.strategy.ts`):
```typescript
{
  sub: string;                // User MongoDB _id
  email: string;
  name?: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'blocked';
  isDeleted?: boolean;
  registrationStrategy?: string;
  isEmailVerified?: boolean;
  onboardingStep?: string;
  isOnboardingCompleted?: boolean;
  type: 'access' | 'refresh';
  jti: string;                // UUID — unique per token
  iat: number;
  exp: number;
}
```

---

### User States

A user record (`src/modules/user/user.model.ts`) moves through two orthogonal state machines:

**Account Status** (`status` field):

| Value | Meaning |
|---|---|
| `active` | Normal operating state |
| `inactive` | Soft-deleted; set automatically on `deleteById()` |
| `blocked` | Manually blocked by an admin; cannot log in |

**Onboarding Step** (`onboardingStep` field):

| Step | Set When | Frontend Route |
|---|---|---|
| `REGISTERED` | User first creates an account | `/onboarding/verify-email` |
| `VERIFIED` | OTP is successfully verified | `/onboarding/profile` |
| `PROFILE_COMPLETED` | *(reserved for future use)* | — |
| `UNDER_REVIEW` | `completeProfile` is called | `/onboarding/pending-review` |
| `APPROVED` | Admin approves the profile | `/dashboard` |

The `onboarding` object returned in every auth response tells the frontend exactly where to redirect:
```json
{
  "onboarding": {
    "step": "VERIFIED",
    "isCompleted": false,
    "nextRoute": "/onboarding/profile"
  }
}
```

---

## 2. Registration Flow

### Endpoint

```
POST /api/v1/auth/register
```

### Middleware chain (in order)

1. `validate(registerBodySchema)` — Zod validation (`src/shared/middlewares/validate.ts`)

### Request body

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "MyPass@123",
  "confirmPassword": "MyPass@123",
  "agreeTermsAndConditions": true
}
```

**Password rules** (enforced by Zod regex `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/`):
- 8–72 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

### Step-by-step execution

```
POST /register
  │
  ├─[1] validate(registerBodySchema)          ← Zod rejects bad input here
  │
  └─[2] authController.register()
            │
            └─[3] authService.register(dto)
                      │
                      ├─[4] userRepository.findByEmailIncludingDeleted(email)
                      │         → If found AND isDeleted=false  →  throw CONFLICT (email taken)
                      │         → If found AND isDeleted=true   →  reuse the soft-deleted record
                      │         → If not found                  →  create new
                      │
                      ├─[5] hashValue(password)                 ← bcrypt, 12 salt rounds
                      │
                      ├─[6] userRepository.create({...dto, password:hash, onboardingStep:'REGISTERED'})
                      │         OR
                      │     userRepository.updateAnyUser(existingId, {...reset fields...})
                      │
                      ├─[7] OTP generation
                      │         otp = Math.floor(10000 + Math.random() * 90000).toString()
                      │         → 5-digit number string, e.g. "47283"
                      │
                      ├─[8] tokenService.createToken({
                      │         userId, token: otp, type: 'verifyEmail',
                      │         expiresAt: now + 600_000ms (10 min)
                      │     })
                      │         → SHA-256 hashes the OTP → stores hash in tokens collection
                      │
                      ├─[9] eventBus.emit('user:registered', { userId, email, name })
                      │
                      ├─[10] eventBus.emit('auth:otp-resend', { userId, email, name, otp, expiresAt })
                      │          → auth.listeners picks this up asynchronously
                      │          → sendMail({ to: email, subject: 'Your OTP Code', html: '...' })
                      │          → addMailLog({ status: 'otp_sent', otp, ... })
                      │
                      └─[11] return { userId, email, name }
```

### Response (201 Created)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Registration successful",
  "data": {
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

### Error cases

| Scenario | HTTP | Message |
|---|---|---|
| Email already registered (active account) | 409 | Email already in use |
| Passwords do not match | 400 | Zod validation error |
| Password too weak | 400 | Zod validation error |
| `agreeTermsAndConditions` is false | 400 | Zod validation error |

---

## 3. Email Verification Flow

### Endpoint

```
POST /api/v1/auth/verify-email
```

### Middleware chain

1. `validate(verifyEmailBodySchema)` — requires `email` (string) and `otp` (5-digit string)

### Step-by-step execution

```
POST /verify-email
  │
  ├─[1] validate(verifyEmailBodySchema)
  │
  └─[2] authController.verifyEmail()
            │
            └─[3] authService.verifyEmail({ email, otp })
                      │
                      ├─[4] userRepository.findByEmail(email)
                      │         → Not found → throw NOT_FOUND
                      │
                      ├─[5] tokenService.validateToken({
                      │         userId, token: otp, type: 'verifyEmail'
                      │     })
                      │         → SHA-256 hashes otp
                      │         → Queries DB: { userId, tokenHash, type, blacklisted:false, expiresAt > now }
                      │         → Not found / expired / blacklisted → throw BAD_REQUEST ("Invalid or expired OTP")
                      │
                      ├─[6] userRepository.updateById(userId, {
                      │         isEmailVerified: true,
                      │         onboardingStep: 'VERIFIED'
                      │     })
                      │
                      ├─[7] tokenService.revokeAllByUser(userId, 'verifyEmail')
                      │         → Marks all verifyEmail tokens for this user as blacklisted
                      │
                      ├─[8] authService.issueTokenPair(user)
                      │         → createAccessToken(user)  → signed JWT, type='access'
                      │         → createRefreshToken(user) → signed JWT, type='refresh'
                      │         → tokenService.createToken(userId, refreshToken, 'refresh', expiresAt)
                      │
                      ├─[9] eventBus.emit('auth:email-verified', { userId, email, name })
                      │         → auth.listeners: otpStore.delete(email)
                      │         → auth.listeners: markEmailVerified(email)  ← updates dev mailbox
                      │
                      └─[10] return buildAuthResponse(user, tokenPair)
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Email verified successfully",
  "data": {
    "user": { "id": "...", "email": "...", "onboardingStep": "VERIFIED", ... },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    },
    "onboarding": {
      "step": "VERIFIED",
      "isCompleted": false,
      "nextRoute": "/onboarding/profile"
    }
  }
}
```

### Error cases

| Scenario | HTTP | Message |
|---|---|---|
| User not found | 404 | User not found |
| OTP is wrong | 400 | Invalid or expired OTP |
| OTP has expired (> 10 min) | 400 | Invalid or expired OTP |
| OTP already used | 400 | Invalid or expired OTP |

---

## 4. Resend OTP Flow

### Endpoint

```
POST /api/v1/auth/resend-otp
```

### Middleware chain

1. `validate(resendOtpBodySchema)` — requires `email`

### Step-by-step execution

```
POST /resend-otp
  │
  ├─[1] validate(resendOtpBodySchema)
  │
  └─[2] authController.resendOtp()
            │
            └─[3] authService.resendOtp({ email })
                      │
                      ├─[4] userRepository.findByEmail(email)
                      │         → Not found → throw NOT_FOUND
                      │
                      ├─[5] If user.isEmailVerified → throw BAD_REQUEST ("Email already verified")
                      │
                      ├─[6] tokenService.revokeAllByUser(userId, 'verifyEmail')
                      │         → Invalidates any previous OTP for this user
                      │
                      ├─[7] Generate new OTP (same logic as register)
                      │         otp = Math.floor(10000 + Math.random() * 90000).toString()
                      │
                      ├─[8] tokenService.createToken({
                      │         userId, token: otp, type: 'verifyEmail',
                      │         expiresAt: now + 600_000ms
                      │     })
                      │
                      ├─[9] eventBus.emit('auth:otp-resend', { userId, email, name, otp, expiresAt })
                      │         → auth.listeners: isResend = otpStore already had this email → true
                      │         → sendMail({ ... })
                      │         → addMailLog({ status: 'otp_resent', otp, ... })
                      │
                      └─[10] return { message: 'OTP resent' }
```

### Important: Resend detection

Inside `auth.listeners.ts`, the listener checks whether `otpStore` already contains an entry for the email **before** updating it:

```typescript
const isResend = otpStore.has(payload.email.toLowerCase());
otpStore.set(payload.email.toLowerCase(), { otp, expiresAt });
addMailLog({ status: isResend ? 'otp_resent' : 'otp_sent', ... });
```

This means the dev mailbox (`/dev/mailbox`) will show a `otp_resent` badge for subsequent sends.

### Error cases

| Scenario | HTTP | Message |
|---|---|---|
| User not found | 404 | User not found |
| Email already verified | 400 | Email already verified |

---

## 5. Login Flow

### Endpoint

```
POST /api/v1/auth/login
```

### Middleware chain

1. `validate(loginBodySchema)` — accepts either `{ email, password }` or `{ provider, token }`

### Supported login modes

- **Local** — email + password
- **Mobile Social** — `provider: 'google' | 'apple'` + `token` (ID token from mobile SDK)

### Step-by-step execution (local login)

```
POST /login
  │
  ├─[1] validate(loginBodySchema)
  │
  └─[2] authController.login()
            │
            └─[3] authService.login(dto)
                      │
                      ├─[4] If dto.provider exists → loginWithMobileSocial() [see §6]
                      │
                      ├─[5] userRepository.findByEmail(email)   ← selects password field
                      │         → Not found → throw UNAUTHORIZED ("Invalid credentials")
                      │         [Generic error — never reveal "email not found"]
                      │
                      ├─[6] isUserLocked(user)
                      │         → lockUntil > now → throw TOO_MANY_REQUESTS ("Too many failed attempts")
                      │
                      ├─[7] compareHash(password, user.password)   ← bcrypt.compare
                      │         → Mismatch → incrementFailedAttempts(user)
                      │                       → if attempts >= AUTH_MAX_FAILED_ATTEMPTS (10):
                      │                             set lockUntil = now + 60 min
                      │                       → throw UNAUTHORIZED
                      │
                      ├─[8] assertUserCanAuthenticate(user, 'local')
                      │         → user.isDeleted    → throw UNAUTHORIZED ("Account deleted")
                      │         → user.status=blocked → throw FORBIDDEN ("Account blocked")
                      │         → user.registrationStrategy ≠ 'local' → throw UNAUTHORIZED ("Provider mismatch")
                      │
                      ├─[9] resetFailedAttempts(user)
                      │         → failedLoginAttempts = 0, lockUntil = null
                      │
                      ├─[10] authService.issueTokenPair(user)
                      │          → createAccessToken  → JWT signed with JWT_ACCESS_SECRET
                      │          → createRefreshToken → JWT signed with JWT_REFRESH_SECRET
                      │          → tokenService.createToken(refreshToken, 'refresh')
                      │
                      ├─[11] userRepository.updateById(userId, {
                      │          lastLoginAt: now,
                      │          lastLoginStrategy: 'local',
                      │          notificationToken: dto.notificationToken,
                      │          deviceType: dto.deviceType
                      │      })
                      │
                      └─[12] return buildAuthResponse(user, tokenPair)
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "user",
      "status": "active",
      "isEmailVerified": true,
      "onboardingStep": "UNDER_REVIEW"
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    },
    "onboarding": {
      "step": "UNDER_REVIEW",
      "isCompleted": false,
      "nextRoute": "/onboarding/pending-review"
    }
  }
}
```

### Error cases

| Scenario | HTTP | Message |
|---|---|---|
| Email not found | 401 | Invalid credentials |
| Wrong password | 401 | Invalid credentials |
| Account locked (≥10 failures) | 429 | Too many failed login attempts |
| Account blocked by admin | 403 | Account is blocked |
| Account soft-deleted | 401 | Account has been deleted |
| Registered via Google, trying local | 401 | Provider mismatch |

---

## 6. Social Login Flow

### Endpoint

```
POST /api/v1/auth/login
Body: { "provider": "google" | "apple", "token": "<id-token-from-sdk>" }
```

### Supported providers

| Provider | Verification Method | Strategy File |
|---|---|---|
| Google | RS256 JWT against Google public keys (cached 1 h) | `src/modules/auth/strategies/google.strategy.ts` |
| Apple | RS256 JWT against Apple public keys | `src/modules/auth/strategies/apple.strategy.ts` |

### Step-by-step execution

```
POST /login  (provider + token body)
  │
  └─[3] authService.login(dto)
            │
            └─[4] authService.loginWithMobileSocial({ provider, token })
                      │
                      ├─[5] if provider = 'google':
                      │         verifyGoogleIdToken(token)
                      │             → fetch Google public keys (JWKS endpoint, cached 1 h)
                      │             → verify signature with RS256
                      │             → check audience = GOOGLE_CLIENT_ID
                      │             → return GoogleProfile { id, email, name, avatarUrl, emailVerified }
                      │
                      │     if provider = 'apple':
                      │         verifyAppleIdentityToken(token)
                      │             → fetch Apple public keys
                      │             → convert JWK → PEM
                      │             → verify RS256 signature
                      │             → return AppleProfile { id, email, name, emailVerified }
                      │
                      ├─[6] userRepository.findByEmail(profile.email)
                      │         → Found:
                      │             assertUserCanAuthenticate(user, provider)
                      │             → blocked / deleted → throw
                      │             → registrationStrategy ≠ provider → throw PROVIDER_MISMATCH
                      │             update: { lastLoginAt, lastLoginStrategy, avatarUrl? }
                      │
                      │         → Not Found:
                      │             userRepository.create({
                      │                 email, name, avatarUrl,
                      │                 registrationStrategy: provider,
                      │                 isEmailVerified: true,       ← OAuth = email already trusted
                      │                 onboardingStep: 'VERIFIED',
                      │                 password: crypto.randomBytes(32).toString('hex')  ← unusable placeholder
                      │             })
                      │
                      ├─[7] authService.issueTokenPair(user)
                      │
                      └─[8] return buildAuthResponse(user, tokenPair)
```

### Key point

Social-login users skip email verification entirely — their `isEmailVerified` is set to `true` on creation and `onboardingStep` starts at `VERIFIED`.

### Error cases

| Scenario | HTTP | Message |
|---|---|---|
| Token signature invalid | 401 | Invalid credentials |
| Token audience mismatch | 401 | Invalid credentials |
| Token expired | 401 | Invalid credentials |
| Account exists but registered via different provider | 401 | Provider mismatch |
| Account blocked | 403 | Account is blocked |

---

## 7. Refresh Token Flow

### Endpoint

```
POST /api/v1/auth/refresh-token
```

### Middleware chain

1. `validate(refreshTokenBodySchema)` — requires `refreshToken` string

### Step-by-step execution

```
POST /refresh-token
  │
  ├─[1] validate(refreshTokenBodySchema)
  │
  └─[2] authController.refreshTokens()
            │
            └─[3] authService.refreshTokens({ refreshToken })
                      │
                      ├─[4] verifyRefreshToken(refreshToken)
                      │         → jwt.verify(token, JWT_REFRESH_SECRET)
                      │         → Check payload.type = 'refresh'
                      │         → Check payload.isDeleted ≠ true
                      │         → Returns decoded payload (includes sub = userId)
                      │
                      ├─[5] tokenService.validateToken({
                      │         userId: payload.sub,
                      │         token: refreshToken,
                      │         type: 'refresh'
                      │     })
                      │         → SHA-256 hash the token
                      │         → Query DB: { userId, tokenHash, type:'refresh', blacklisted:false, expiresAt > now }
                      │         → Not found → throw UNAUTHORIZED ("Invalid or expired refresh token")
                      │
                      ├─[6] tokenService.revokeToken(existingTokenDoc._id)
                      │         → Old refresh token is blacklisted immediately (token rotation)
                      │
                      ├─[7] userRepository.findById(userId)
                      │         → Not found / deleted → throw UNAUTHORIZED
                      │
                      ├─[8] authService.issueTokenPair(user)
                      │         → Brand new access + refresh token pair
                      │
                      └─[9] return { tokens: { accessToken, refreshToken } }
```

### Security note

This implements **refresh token rotation** — every call to `/refresh-token` invalidates the old refresh token and issues a new one. A stolen refresh token can only be used once before it's blacklisted.

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tokens refreshed",
  "data": {
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    }
  }
}
```

### Error cases

| Scenario | HTTP | Message |
|---|---|---|
| Token JWT signature invalid | 401 | Invalid or expired refresh token |
| Token not in DB (already rotated / revoked) | 401 | Invalid or expired refresh token |
| Token marked blacklisted | 401 | Invalid or expired refresh token |
| Token expired | 401 | Invalid or expired refresh token |

---

## 8. Forgot Password Flow

### Endpoint

```
POST /api/v1/auth/forgot-password
```

### Middleware chain

1. `validate(forgotPasswordBodySchema)` — requires `email`

### Step-by-step execution

```
POST /forgot-password
  │
  ├─[1] validate(forgotPasswordBodySchema)
  │
  └─[2] authController.forgotPassword()
            │
            └─[3] authService.forgotPassword({ email })
                      │
                      ├─[4] userRepository.findByEmail(email)
                      │         → Not found → silently return (no information leakage)
                      │         [The API always returns 200 whether or not the email exists]
                      │
                      ├─[5] tokenService.revokeAllByUser(userId, 'resetPassword')
                      │         → Invalidates any prior reset codes
                      │
                      ├─[6] Generate reset OTP (same 5-digit logic)
                      │         code = Math.floor(10000 + Math.random() * 90000).toString()
                      │
                      ├─[7] tokenService.createToken({
                      │         userId, token: code, type: 'resetPassword',
                      │         expiresAt: now + JWT_RESET_PASSWORD_EXPIRATION_HOURS (default 1 h)
                      │     })
                      │
                      ├─[8] eventBus.emit('auth:password-reset-requested', { userId, email, name, otp: code, expiresAt })
                      │         → auth.listeners: sendMail({ subject: 'Password Reset Code', ... })
                      │         → auth.listeners: addMailLog({ status: 'reset_requested', otp: code })
                      │         → auth.listeners: notificationService.createNotification(...)
                      │
                      └─[9] return { message: 'Password reset code sent' }
```

### Response (200 OK)

Always 200, even if email does not exist (prevents email enumeration).

### Error cases

| Scenario | HTTP | Message |
|---|---|---|
| Zod validation fails | 400 | Validation error |

---

## 9. Verify Reset Code Flow

### Endpoint

```
POST /api/v1/auth/verify-reset-code
```

### Middleware chain

1. `validate(verifyResetCodeBodySchema)` — requires `email`, `otp` (5-digit string)

### Step-by-step execution

```
POST /verify-reset-code
  │
  ├─[1] validate(verifyResetCodeBodySchema)
  │
  └─[2] authController.verifyResetCode()
            │
            └─[3] authService.verifyResetCode({ email, otp })
                      │
                      ├─[4] userRepository.findByEmail(email)
                      │         → Not found → throw NOT_FOUND
                      │
                      ├─[5] tokenService.validateToken({
                      │         userId, token: otp, type: 'resetPassword'
                      │     })
                      │         → Hash otp → query DB
                      │         → Invalid / expired / blacklisted → throw BAD_REQUEST
                      │
                      ├─[6] authService.issueTokenPair(user)
                      │         → Issues new access + refresh tokens
                      │         → These tokens authorize the subsequent resetPassword call
                      │
                      └─[7] return { user, tokens }   ← NO onboarding metadata
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Reset code verified",
  "data": {
    "user": { "id": "...", "email": "..." },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    }
  }
}
```

### Error cases

| Scenario | HTTP | Message |
|---|---|---|
| User not found | 404 | User not found |
| Wrong code | 400 | Invalid or expired OTP |
| Code expired (> 1 h) | 400 | Invalid or expired OTP |

---

## 10. Reset Password Flow

### Endpoint

```
POST /api/v1/auth/reset-password
```

### Middleware chain

1. `authenticate` — requires valid access token (from `verifyResetCode` step above)
2. `validate(resetPasswordBodySchema)` — requires `password`, `confirmPassword`

### Step-by-step execution

```
POST /reset-password  (Authorization: Bearer <accessToken from verify-reset-code>)
  │
  ├─[1] authenticate()  — verifies access token, sets req.user
  ├─[2] validate(resetPasswordBodySchema)
  │
  └─[3] authController.resetPassword()
            │
            └─[4] authService.resetPassword({ userId: req.user.id, password })
                      │
                      ├─[5] hashValue(password)   ← bcrypt, 12 salt rounds
                      │
                      ├─[6] userRepository.updateById(userId, { password: hash })
                      │
                      ├─[7] tokenService.revokeAllByUser(userId, 'refresh')
                      │         → All active sessions are invalidated
                      │
                      ├─[8] tokenService.revokeAllByUser(userId, 'resetPassword')
                      │         → OTP tokens cleaned up
                      │
                      ├─[9] eventBus.emit('auth:password-reset', { userId, email, name })
                      │         → Currently only logs the event
                      │
                      └─[10] return { message: 'Password reset successfully' }
```

### Error cases

| Scenario | HTTP | Message |
|---|---|---|
| No access token / expired token | 401 | Unauthorized |
| Passwords do not match | 400 | Validation error |
| Password too weak | 400 | Validation error |

---

## 11. Change Password Flow

### Endpoint

```
POST /api/v1/auth/change-password
```

### Middleware chain

1. `authenticate` — must be logged in
2. `validate(changePasswordBodySchema)` — requires `newPassword`; `currentPassword` is optional (required for local accounts)

### Step-by-step execution

```
POST /change-password  (Authorization: Bearer <accessToken>)
  │
  ├─[1] authenticate()
  ├─[2] validate(changePasswordBodySchema)
  │
  └─[3] authController.changePassword()
            │
            └─[4] authService.changePassword({ userId, currentPassword?, newPassword, isReset? })
                      │
                      ├─[5] userRepository.findByIdWithPassword(userId)
                      │         → Fetches user WITH password field (normally excluded)
                      │
                      ├─[6] If registrationStrategy = 'local' AND isReset ≠ true:
                      │         compareHash(currentPassword, user.password)
                      │         → Mismatch → throw UNAUTHORIZED ("Current password is incorrect")
                      │
                      ├─[7] If newPassword = currentPassword → throw BAD_REQUEST
                      │         [Zod schema also enforces this at validation layer]
                      │
                      ├─[8] hashValue(newPassword)   ← bcrypt, 12 salt rounds
                      │
                      ├─[9] userRepository.updateById(userId, { password: hash })
                      │
                      ├─[10] tokenService.revokeAllByUser(userId, 'refresh')
                      │          → Forces re-login on all devices
                      │
                      └─[11] return { message: 'Password changed successfully' }
```

### Error cases

| Scenario | HTTP | Message |
|---|---|---|
| Not authenticated | 401 | Unauthorized |
| `currentPassword` wrong | 401 | Current password is incorrect |
| `newPassword` same as current | 400 | New password must differ from current |
| Password too weak | 400 | Validation error |

---

## 12. Complete Profile Flow

### Endpoint

```
POST /api/v1/auth/complete-profile
Content-Type: multipart/form-data
```

### Middleware chain

1. `authenticate` — must be logged in
2. `uploadFields([{ name: 'propertyImages', maxCount: 10 }, { name: 'propertyVideos', maxCount: 1 }])` — Multer file upload

### Step-by-step execution

```
POST /complete-profile  (Authorization: Bearer + multipart body)
  │
  ├─[1] authenticate()
  ├─[2] uploadFields(...)    ← Multer handles file buffering
  │
  └─[3] authController.completeProfile()
            │
            ├─[4] File upload handling (storage-mode-dependent):
            │
            │     if STORAGE_MODE = 's3':
            │         Upload each file to S3 via s3Service.upload()
            │         → Returns S3 URLs
            │
            │     if STORAGE_MODE = 'local' | 'cloudinary':
            │         Files already saved locally by Multer
            │         → Build local file paths
            │
            ├─[5] authService.completeProfile({
            │         userId: req.user.id,
            │         avatarUrl,
            │         userRole,
            │         phone,
            │         countryCode,
            │         address,
            │         propertyImages: [...urls],
            │         propertyVideos: [...urls]
            │     })
            │         │
            │         ├─[6] userRepository.updateById(userId, {
            │         │         ...profileFields,
            │         │         onboardingStep: 'UNDER_REVIEW'
            │         │     })
            │         │
            │         ├─[7] authService.issueTokenPair(updatedUser)
            │         │         → New tokens reflect updated onboardingStep in JWT payload
            │         │
            │         └─[8] return buildAuthResponse(updatedUser, tokenPair)
            │                   onboarding.step = 'UNDER_REVIEW'
            │                   onboarding.nextRoute = '/onboarding/pending-review'
            │
            └─[9] sendResponse(res, { data: authResponse })
```

### Fields accepted in form body

| Field | Required | Notes |
|---|---|---|
| `avatarUrl` | No | Or uploaded file path |
| `userRole` | Yes | `landlord` / `homeOwner` / `renter` |
| `phone` | No | |
| `countryCode` | No | |
| `address` | No | |
| `propertyImages` | No | Up to 10 files |
| `propertyVideos` | No | Up to 1 file |

### Error cases

| Scenario | HTTP | Message |
|---|---|---|
| Not authenticated | 401 | Unauthorized |
| File too large | 400 | Multer error |
| S3 upload fails | 500 | Internal server error |

---

## 13. Utility Functions Mapping

| Function | File | Purpose | Used In |
|---|---|---|---|
| `hashValue(value)` | `src/shared/utils/hash.ts` | bcrypt hash (12 rounds) | Register, Change Password, Reset Password |
| `compareHash(value, hash)` | `src/shared/utils/hash.ts` | bcrypt.compare | Login, Change Password |
| `catchAsync(fn)` | `src/shared/utils/catchAsync.ts` | Wraps async handlers; forwards errors to Express error handler | All controllers |
| `sendResponse(res, opts)` | `src/shared/utils/sendResponse.ts` | Standardises API response shape `{success,statusCode,message,data}` | All controllers |
| `verifyAccessToken(token)` | `src/modules/auth/strategies/jwt.strategy.ts` | jwt.verify + type/deletion checks | `authenticate` middleware |
| `verifyRefreshToken(token)` | `src/modules/auth/strategies/jwt.strategy.ts` | jwt.verify + type checks | `refreshTokens` service |
| `extractBearerToken(header)` | `src/modules/auth/strategies/jwt.strategy.ts` | Parses `"Bearer <token>"` | `authenticate` middleware |
| `verifyGoogleIdToken(token)` | `src/modules/auth/strategies/google.strategy.ts` | RS256 JWT verification against Google JWKS | Social Login (Google) |
| `verifyAppleIdentityToken(token)` | `src/modules/auth/strategies/apple.strategy.ts` | RS256 JWT verification against Apple public keys | Social Login (Apple) |
| `tokenService.createToken()` | `src/modules/token/token.service.ts` | SHA-256 hash token → persist in `tokens` collection | Register, Resend OTP, Forgot Password |
| `tokenService.validateToken()` | `src/modules/token/token.service.ts` | Hash input → find in DB (non-blacklisted, non-expired) | Verify Email, Verify Reset Code, Refresh Token |
| `tokenService.revokeToken()` | `src/modules/token/token.service.ts` | Mark single token as `blacklisted=true` | Refresh Token (rotation) |
| `tokenService.revokeAllByUser()` | `src/modules/token/token.service.ts` | Bulk-blacklist all tokens of a type for a user | Logout, Reset Password, Change Password |
| `sendMail(opts)` | `src/infrastructure/mail/mail.transport.ts` | Send email via SMTP (or SES if `STORAGE_MODE=s3`) | Auth event listeners |
| `getMailTransporter()` | `src/infrastructure/mail/mail.transport.ts` | Returns singleton nodemailer Transporter | `sendMail` |
| `verifyMailTransport()` | `src/infrastructure/mail/mail.transport.ts` | One-time SMTP connection check on server start | `server.ts` |
| `addMailLog(entry)` | `src/infrastructure/mail/mail.log.ts` | Stores sent email in dev in-memory log | Auth event listeners |
| `markEmailVerified(email)` | `src/infrastructure/mail/mail.log.ts` | Flips most-recent log entry to `verified` | `auth:email-verified` listener |
| `getMailLogs()` | `src/infrastructure/mail/mail.log.ts` | Returns full dev email log | `GET /dev/mailbox` |
| `getDevOtp(email)` | `src/infrastructure/events/listeners/auth.listeners.ts` | Returns in-memory OTP for testing (respects expiry) | `GET /dev/otp` |
| `buildAuthResponse(user, tokens)` | `src/modules/auth/auth.service.ts` | Adds `onboarding` metadata to response | Login, Verify Email, Complete Profile |
| `buildAuthUser(user)` | `src/modules/auth/auth.service.ts` | Serialises user fields for auth response | `buildAuthResponse` |
| `assertUserCanAuthenticate(user, strategy)` | `src/modules/auth/auth.service.ts` | Guards: deleted / blocked / wrong provider | Login, Social Login |
| `isUserLocked(user)` | `src/modules/auth/auth.service.ts` | Checks if `lockUntil > now` | Login |
| `incrementFailedAttempts(user)` | `src/modules/auth/auth.service.ts` | Increments counter; locks if ≥ threshold | Login (wrong password) |
| `resetFailedAttempts(user)` | `src/modules/auth/auth.service.ts` | Clears `failedLoginAttempts` and `lockUntil` | Login (success) |
| `issueTokenPair(user)` | `src/modules/auth/auth.service.ts` | Creates + stores access & refresh token pair | Login, Verify Email, Verify Reset Code, Complete Profile, Refresh Token |
| `userSerializer(user)` | `src/modules/user/user.serializer.ts` | Strips `password` and internal fields from DB document | `GET /me` |

---

## 14. Route → Controller → Service → Utils Mapping

| Route | Controller Method | Service Method | Middleware | Utils / Helpers |
|---|---|---|---|---|
| `POST /register` | `authController.register` | `authService.register` | `validate(registerBodySchema)` | `hashValue`, `tokenService.createToken`, `eventBus.emit`, `sendMail`, `addMailLog` |
| `POST /login` | `authController.login` | `authService.login` | `validate(loginBodySchema)` | `compareHash`, `isUserLocked`, `incrementFailedAttempts`, `resetFailedAttempts`, `assertUserCanAuthenticate`, `issueTokenPair`, `buildAuthResponse` |
| `POST /login` (social) | `authController.login` | `authService.loginWithMobileSocial` | `validate(loginBodySchema)` | `verifyGoogleIdToken` or `verifyAppleIdentityToken`, `issueTokenPair`, `buildAuthResponse` |
| `POST /verify-email` | `authController.verifyEmail` | `authService.verifyEmail` | `validate(verifyEmailBodySchema)` | `tokenService.validateToken`, `tokenService.revokeAllByUser`, `issueTokenPair`, `buildAuthResponse`, `markEmailVerified` |
| `POST /resend-otp` | `authController.resendOtp` | `authService.resendOtp` | `validate(resendOtpBodySchema)` | `tokenService.revokeAllByUser`, `tokenService.createToken`, `eventBus.emit`, `sendMail`, `addMailLog` |
| `POST /refresh-token` | `authController.refreshTokens` | `authService.refreshTokens` | `validate(refreshTokenBodySchema)` | `verifyRefreshToken`, `tokenService.validateToken`, `tokenService.revokeToken`, `issueTokenPair` |
| `POST /logout` | `authController.logout` | `authService.logout` | `authenticate` | `tokenService.revokeToken` |
| `GET /me` | `authController.me` | `userService.getById` | `authenticate` | `userSerializer` |
| `POST /forgot-password` | `authController.forgotPassword` | `authService.forgotPassword` | `validate(forgotPasswordBodySchema)` | `tokenService.revokeAllByUser`, `tokenService.createToken`, `eventBus.emit`, `sendMail`, `addMailLog` |
| `POST /verify-reset-code` | `authController.verifyResetCode` | `authService.verifyResetCode` | `validate(verifyResetCodeBodySchema)` | `tokenService.validateToken`, `issueTokenPair` |
| `POST /reset-password` | `authController.resetPassword` | `authService.resetPassword` | `authenticate`, `validate(resetPasswordBodySchema)` | `hashValue`, `tokenService.revokeAllByUser` |
| `POST /change-password` | `authController.changePassword` | `authService.changePassword` | `authenticate`, `validate(changePasswordBodySchema)` | `compareHash`, `hashValue`, `tokenService.revokeAllByUser` |
| `POST /complete-profile` | `authController.completeProfile` | `authService.completeProfile` | `authenticate`, `uploadFields(...)` | `s3Service.upload` (if S3 mode), `issueTokenPair`, `buildAuthResponse` |
| `GET /dev/otp` | `devController.getOtp` | — | *(none — dev only)* | `getDevOtp` |
| `GET /dev/mailbox` | `devController.getMailbox` | — | *(none — dev only)* | `getMailLogs` |

---

## 15. Database Collections Used

### `users` collection

**Model file:** `src/modules/user/user.model.ts`

| Field | Type | Notes |
|---|---|---|
| `name` | String | 2–120 chars, required |
| `email` | String | Unique per non-deleted user, lowercase |
| `password` | String | bcrypt hash, `select: false` (never returned by default) |
| `role` | Enum | `user` / `admin`, default `user` |
| `userRole` | Enum | `landlord` / `homeOwner` / `renter` |
| `status` | Enum | `active` / `inactive` / `blocked`, default `active` |
| `registrationStrategy` | Enum | `local` / `google` / `apple` |
| `lastLoginStrategy` | Enum | Same as above |
| `lastLoginAt` | Date | Updated on every successful login |
| `isEmailVerified` | Boolean | Set `true` after OTP verified or social login |
| `isDeleted` | Boolean | Soft-delete flag |
| `deletedAt` | Date | Set when soft-deleted |
| `failedLoginAttempts` | Number | Reset to 0 on successful login |
| `lockUntil` | Date | Set to `now + 60 min` after 10 failures |
| `onboardingStep` | Enum | `REGISTERED → VERIFIED → UNDER_REVIEW → APPROVED` |
| `isOnboardingCompleted` | Boolean | Set when `onboardingStep = APPROVED` |
| `agreeTermsAndConditions` | Boolean | |
| `termsAcceptedAt` | Date | |
| `avatarUrl` | String | |
| `propertyImages` | String[ ] | Max 10 |
| `propertyVideos` | String[ ] | Max 10 |
| `notificationToken` | String | Push notification device token |
| `deviceType` | Enum | `ios` / `android` / `web` |
| `subscriptionId` | ObjectId | Ref → `subscriptions` |

**Key index:** `{ email: 1 }` with partial filter `{ isDeleted: false }` — allows the same email to exist for a deleted + active user simultaneously.

---

### `tokens` collection

**Model file:** `src/modules/token/token.model.ts`

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | Ref → `users` |
| `tokenHash` | String | SHA-256 hash of the raw token value |
| `type` | Enum | `refresh` / `resetPassword` / `verifyEmail` |
| `expiresAt` | Date | MongoDB TTL index auto-deletes expired documents |
| `blacklisted` | Boolean | Revoked tokens stay in DB until TTL removes them |

**Purpose by type:**

| Type | Created By | Validated By | Revoked By |
|---|---|---|---|
| `verifyEmail` | `register`, `resendOtp` | `verifyEmail` | `verifyEmail` (all), `resendOtp` (all) |
| `resetPassword` | `forgotPassword` | `verifyResetCode` | `resetPassword` (all) |
| `refresh` | `issueTokenPair` | `refreshTokens` | `logout`, `refreshTokens` (rotation), `changePassword`, `resetPassword` |

**Token hashing flow:**
```
Raw token (OTP or JWT string)
    │
    ▼
crypto.createHash('sha256').update(token).digest('hex')
    │
    ▼
tokenHash stored in DB
```

---

## 16. Authentication Flow Summary

### Full registration → login lifecycle

```
[Client]                    [API]                          [DB / Email]
   │                          │                                 │
   │── POST /register ────────►│                                 │
   │   {email,password,name}   │── findByEmail ────────────────►│
   │                          │◄─ null / deleted user ──────────│
   │                          │── hashPassword ──────────────────── (bcrypt)
   │                          │── createUser ──────────────────►│
   │                          │── createOtpToken (hash) ───────►│
   │                          │── emit(auth:otp-resend) ─────── async ──► sendMail
   │◄── 201 {userId,email} ───│                                 │
   │                          │                                 │
   │── POST /verify-email ────►│                                 │
   │   {email, otp:"47283"}    │── findUser ────────────────────►│
   │                          │── validateToken (hash otp) ────►│
   │                          │── updateUser(isEmailVerified=true)►│
   │                          │── revokeAllOtpTokens ──────────►│
   │                          │── issueTokenPair ───────────────►│ (store refresh hash)
   │                          │── emit(auth:email-verified)
   │◄── 200 {user,tokens} ────│
   │    onboarding.step=VERIFIED
   │
   │── POST /complete-profile ►│                                 │
   │   (multipart + files)     │── upload files (S3 / local)
   │                          │── updateUser(onboardingStep=UNDER_REVIEW) ►│
   │                          │── issueTokenPair ───────────────►│
   │◄── 200 {user,tokens} ────│
   │    onboarding.step=UNDER_REVIEW
   │
   │  [Admin approves profile via admin panel]
   │
   │── POST /login ───────────►│                                 │
   │   {email, password}       │── findUser (with password) ────►│
   │                          │── checkLock
   │                          │── compareHash
   │                          │── assertUserCanAuth
   │                          │── resetFailedAttempts
   │                          │── issueTokenPair ───────────────►│
   │◄── 200 {user,tokens} ────│
   │    onboarding.step=APPROVED
   │
   │── GET /me ───────────────►│
   │   Bearer: <accessToken>   │── verifyAccessToken
   │                          │── getById ──────────────────────►│
   │◄── 200 {user} ───────────│
   │
   │── POST /refresh-token ───►│                                 │
   │   {refreshToken}          │── verifyRefreshToken
   │                          │── validateToken ────────────────►│
   │                          │── revokeToken (old) ───────────►│
   │                          │── issueTokenPair ───────────────►│
   │◄── 200 {tokens} ─────────│
   │
   │── POST /logout ──────────►│                                 │
   │   Bearer + {refreshToken} │── revokeToken ─────────────────►│
   │◄── 200 ──────────────────│
```

---

### Forgot password → reset lifecycle

```
[Client]                    [API]                          [DB / Email]
   │                          │                                 │
   │── POST /forgot-password ─►│                                 │
   │   {email}                 │── findUser ────────────────────►│
   │                          │── revokeAllResetTokens ────────►│
   │                          │── createResetToken (hash) ─────►│
   │                          │── emit(auth:password-reset-requested) ──► sendMail
   │◄── 200 {message} ────────│  (200 even if email not found)  │
   │
   │── POST /verify-reset-code►│                                 │
   │   {email, otp:"39201"}    │── findUser ────────────────────►│
   │                          │── validateToken ────────────────►│
   │                          │── issueTokenPair ───────────────►│
   │◄── 200 {user,tokens} ────│
   │
   │── POST /reset-password ──►│                                 │
   │   Bearer: <accessToken>   │── verifyAccessToken
   │   {password}              │── hashPassword
   │                          │── updateUser(password=hash) ────►│
   │                          │── revokeAllRefreshTokens ───────►│
   │                          │── revokeAllResetTokens ─────────►│
   │◄── 200 {message} ────────│
```

---

### Brute-force protection

```
Login attempt fails (wrong password)
    │
    ▼
failedLoginAttempts += 1
    │
    ├── If failedLoginAttempts >= AUTH_MAX_FAILED_ATTEMPTS (default 10):
    │       lockUntil = now + AUTH_LOCK_DURATION_MINUTES (default 60 min)
    │       → Next login returns 429 Too Many Requests
    │
    └── If failedLoginAttempts < 10:
            → Returns 401 Unauthorized

Successful login:
    failedLoginAttempts = 0
    lockUntil = null
```

---

### Dev-only helpers

These routes are available only in development (`NODE_ENV=development`) to assist with testing:

| Route | Purpose |
|---|---|
| `GET /api/v1/dev/otp?email=x` | Returns the currently active OTP from the in-memory store |
| `GET /api/v1/dev/mailbox` | Returns all emails sent during this process lifetime with status badges |

The `postman/ses-mailbox.html` file is a standalone browser page that polls `/dev/mailbox` every 5 seconds and displays sent emails in a table with colour-coded status labels: `otp_sent` (blue), `otp_resent` (yellow), `reset_requested` (orange), `verified` (green).

---

*Generated from source at `src/modules/auth/`, `src/modules/user/`, `src/modules/token/`, `src/infrastructure/`.*
