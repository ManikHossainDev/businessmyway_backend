import crypto from 'node:crypto';

const parseDurationMs = (duration: string): number => {
    const num = parseInt(duration, 10);
    const unit = duration.slice(-1);
    const multipliers: Record<string, number> = {
        s: 1_000,
        m: 60_000,
        h: 3_600_000,
        d: 86_400_000,
    };
    return num * (multipliers[unit] ?? 60_000);
};
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { MESSAGES } from '@/core/constants/messages';
import {
    BadRequestError,
    UnauthorizedError,
    TooManyRequestsError,
    NotFoundError,
    ForbiddenError,
} from '@/core/errors';
import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '@/core/interfaces/repository.interface';
import { compareHash, hashValue } from '@/shared/utils/hash';
import { getUniqueOtpCode } from '@/shared/utils/otp';
import { ROLES } from '@/core/constants/roles';
import { userRepository, type UserRepository } from '../user/user.repository';
import { AUTH_STRATEGIES, ONBOARDING_STEPS, type AuthStrategy } from '../user/user.constants';
import type { IUserDocument } from '../user/user.interface';
import { userService, type UserService } from '../user/user.service';
import { tokenService, type TokenService } from '../token/token.service';
import { TOKEN_TYPES } from '../token/token.constants';
import type {
    AuthResponse,
    LoginInput,
    OAuthCallbackInput,
    RefreshInput,
    RegisterInput,
    RegisterResponse,
    TokenPair,
    ForgotPasswordInput,
    VerifyResetCodeInput,
    ResendOtpInput,
    VerifyEmailInput,
    VerifyEmailResponse,
    ChangePasswordInput,
    VerifyResetCodeResponse,
    ForgotPasswordResponse,
    ResetPasswordInput,
} from './auth.interface';
import { AUTH_JWT_TYPES } from './auth.constants';
import {
    verifyGoogleIdToken,
    verifyAppleIdentityToken,
    type GoogleProfile,
    type AppleProfile,
} from './strategies';
import { eventBus } from '@/infrastructure/events/event-bus';
import { logger } from '@/infrastructure/logger/winston.logger';
import { AssertUserApi } from '@/core/errors/AssertUserApi';
import { getExpiryDate } from '@/shared/utils/duration';
import { walletService, type WalletService } from '../wallet/wallet.service';
import mongoose from 'mongoose';

const MAX_FAILED_ATTEMPTS = config.auth.maxFailedAttempts;
const LOCK_DURATION = config.auth.lockDurationMinutes * 60 * 1000;

const isUserLocked = (user: IUserDocument): boolean =>
    !!(user.lockUntil && new Date(user.lockUntil) > new Date());

const incrementFailedAttempts = async (user: IUserDocument, options?: RepositoryWriteOptions) => {
    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    let lockUntil = user.lockUntil;
    if (failedAttempts >= MAX_FAILED_ATTEMPTS && !isUserLocked(user)) {
        lockUntil = new Date(Date.now() + LOCK_DURATION);
    }
    await userRepository.updateById(
        user.id,
        { failedLoginAttempts: failedAttempts, lockUntil },
        options,
    );
};

const resetFailedAttempts = async (user: IUserDocument, options?: RepositoryWriteOptions) => {
    await userRepository.updateById(user.id, { failedLoginAttempts: 0, lockUntil: null }, options);
};

const toUserId = (user: IUserDocument): string => user.id ?? String((user as any)._id ?? '');

export class AuthService {
    constructor(
        private readonly users: UserRepository = userRepository,
        private readonly tokens: TokenService = tokenService,
        private readonly userDomainService: UserService = userService,
        private readonly wallets: WalletService = walletService,
    ) {}

    private getRegistrationStrategy(user: IUserDocument): AuthStrategy {
        return user.registrationStrategy ?? AUTH_STRATEGIES.LOCAL;
    }

    private createAccessToken(user: IUserDocument): string {
        return jwt.sign(
            {
                sub: toUserId(user),
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status,
                isDeleted: user.isDeleted,
                registrationStrategy: this.getRegistrationStrategy(user),
                isEmailVerified: user.isEmailVerified,
                onboardingStep: user.onboardingStep,
                isOnboardingCompleted: user.isOnboardingCompleted,
                type: AUTH_JWT_TYPES.ACCESS,
                jti: crypto.randomUUID(),
            },
            config.jwt.accessSecret,
            { expiresIn: config.jwt.accessExpiry as never },
        );
    }

    private createRefreshToken(user: IUserDocument): string {
        return jwt.sign(
            {
                sub: toUserId(user),
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status,
                isDeleted: user.isDeleted,
                registrationStrategy: this.getRegistrationStrategy(user),
                isEmailVerified: user.isEmailVerified,
                onboardingStep: user.onboardingStep,
                isOnboardingCompleted: user.isOnboardingCompleted,
                type: AUTH_JWT_TYPES.REFRESH,
                jti: crypto.randomUUID(),
            },
            config.jwt.refreshSecret,
            { expiresIn: config.jwt.refreshExpiry as never },
        );
    }

    private async issueTokenPair(
        user: IUserDocument,
        options?: RepositoryWriteOptions,
    ): Promise<TokenPair> {
        const accessToken = this.createAccessToken(user);
        const refreshToken = this.createRefreshToken(user);
        const refreshExpiresAt = new Date(Date.now() + parseDurationMs(config.jwt.refreshExpiry));
        await this.tokens.createToken(
            {
                userId: toUserId(user),
                token: refreshToken,
                type: TOKEN_TYPES.REFRESH,
                expiresAt: refreshExpiresAt,
            },
            options,
        );
        return { accessToken, refreshToken };
    }

    private buildAuthUser(user: IUserDocument) {
        return {
            id: toUserId(user),
            name: user.name,
            email: user.email,
            phone: user.phone,
            countryCode: user.countryCode,
            role: user.role,
            status: user.status,
            registrationStrategy: this.getRegistrationStrategy(user),
            lastLoginStrategy: user.lastLoginStrategy,
            isEmailVerified: user.isEmailVerified,
            avatar: user.avatar,
            address: user.address,
            onboardingStep: user.onboardingStep,
            isOnboardingCompleted: user.isOnboardingCompleted,
            discountValue: user.discountValue,
            commissionValue: user.commissionValue,
            notificationToken: user.notificationToken,
            deviceType: user.deviceType,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    private async buildAuthResponse(user: IUserDocument, tokens: TokenPair): Promise<AuthResponse> {
        return {
            user: this.buildAuthUser(user),
            tokens,
            onboarding: {
                step: user.onboardingStep,
                isCompleted: user.isOnboardingCompleted,
                nextRoute: user.isOnboardingCompleted
                    ? '/home'
                    : `/onboarding/${user.onboardingStep.toLowerCase()}`,
            },
        };
    }

    private assertUserCanAuthenticate(user: IUserDocument, expectedStrategy?: AuthStrategy) {
        if (user.isDeleted) throw new UnauthorizedError(MESSAGES.AUTH.ACCOUNT_DELETED);
        if (user.status === 'blocked') throw new UnauthorizedError(MESSAGES.AUTH.ACCOUNT_BLOCKED);
        if (expectedStrategy && this.getRegistrationStrategy(user) !== expectedStrategy)
            throw new UnauthorizedError(MESSAGES.AUTH.PROVIDER_MISMATCH);
    }

    private async touchLastLogin(
        user: IUserDocument,
        strategy: AuthStrategy,
        options?: RepositoryWriteOptions,
    ): Promise<IUserDocument> {
        const now = new Date();
        const updated = await this.users.updateById(
            toUserId(user),
            { lastLoginAt: now, lastLoginStrategy: strategy } as Partial<IUserDocument>,
            options,
        );
        return (
            updated ?? ({ ...user, lastLoginAt: now, lastLoginStrategy: strategy } as IUserDocument)
        );
    }

    private createOnboardingToken(user: IUserDocument): string {
        return jwt.sign(
            {
                sub: toUserId(user),
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status,
                isDeleted: user.isDeleted,
                registrationStrategy: this.getRegistrationStrategy(user),
                isEmailVerified: user.isEmailVerified,
                onboardingStep: user.onboardingStep,
                isOnboardingCompleted: user.isOnboardingCompleted,
                type: AUTH_JWT_TYPES.ONBOARDING,
                jti: crypto.randomUUID(),
            },
            config.jwt.accessSecret,
            { expiresIn: '30m' as never },
        );
    }

    private createVerificationToken(user: IUserDocument): string {
        return jwt.sign(
            {
                sub: toUserId(user),
                email: user.email,
                type: AUTH_JWT_TYPES.VERIFICATION,
                jti: crypto.randomUUID(),
            },
            config.jwt.accessSecret,
            { expiresIn: '15m' as never },
        );
    }

    private createForgotPassToken(user: IUserDocument): string {
        return jwt.sign(
            {
                sub: toUserId(user),
                email: user.email,
                type: AUTH_JWT_TYPES.FORGOT_PASS,
                jti: crypto.randomUUID(),
            },
            config.jwt.accessSecret,
            { expiresIn: '15m' as never },
        );
    }

    private async assertUserIsApproved(
        user: IUserDocument,
        options?: RepositoryWriteOptions,
    ): Promise<void> {
        switch (user.onboardingStep) {
            case ONBOARDING_STEPS.REGISTERED:
                await this.assertEmailVerified(user, options);
                const verificationToken = this.createVerificationToken(user);
                throw new AssertUserApi('OTP has been sent to your email.', 'EMAIL_NOT_VERIFIED', {
                    userId: toUserId(user),
                    email: user.email,
                    verificationToken,
                });
            case ONBOARDING_STEPS.VERIFIED:
        }
        // APPROVED — allow through
    }

    private assertEmailVerified = async (user: IUserDocument, options?: RepositoryWriteOptions) => {
        const { otp, expiresAt } = getUniqueOtpCode({
            expiresInMinutes: config.auth.otpExpiresMinutes,
        });

        await this.tokens.createToken(
            { userId: toUserId(user), token: otp, type: TOKEN_TYPES.VERIFY_EMAIL, expiresAt },
            options,
        );

        eventBus.emit('auth:otp-resend', {
            userId: toUserId(user),
            email: user.email,
            name: user.name,
            otp: otp,
            expiresAt,
        });
    };

    private assertProfileNotCompleted = async (
        user: IUserDocument,
        options?: RepositoryWriteOptions,
    ) => {
        await this.tokens.revokeAllByUser(toUserId(user), TOKEN_TYPES.VERIFY_EMAIL, options);

        const onboardingToken = this.createOnboardingToken(user);

        return onboardingToken;
    };

    private splitName(fullName: string): string {
        return fullName.trim();
    }

    private async upsertSocialUser(
        profile: GoogleProfile | AppleProfile,
        strategy: AuthStrategy,
        options?: RepositoryWriteOptions,
    ): Promise<IUserDocument> {
        const existing = await this.users.findByEmail(profile.email, options);
        const now = new Date();

        if (!existing) {
            const name = this.splitName(profile.name || '');
            const generatedPassword = crypto.randomBytes(32).toString('base64url');
            const hashedPassword = await hashValue(generatedPassword);

            const user = await this.users.create(
                {
                    name,
                    email: profile.email.toLowerCase(),
                    phone: '',
                    countryCode: '',
                    password: hashedPassword,
                    role: ROLES.USER,
                    registrationStrategy: strategy,
                    lastLoginStrategy: strategy,
                    isEmailVerified: 'emailVerified' in profile ? profile.emailVerified : true,
                    isDeleted: false,
                    deletedAt: null,
                    avatar: profile.avatarUrl,
                    lastLoginAt: now,
                    isOnboardingCompleted: false,
                    onboardingStep: ONBOARDING_STEPS.VERIFIED,
                    agreeTermsAndConditions: true,
                    termsAcceptedAt: now,
                } as any,
                options,
            );

            // Create wallet for social user (already verified)
            const wallet = await this.wallets.createWallet(
                new mongoose.Types.ObjectId(toUserId(user)),
                options,
            );
            await this.users.updateById(
                toUserId(user),
                { walletId: wallet._id as any } as any,
                options,
            );

            eventBus.emit('auth:email-verified', {
                userId: toUserId(user),
                email: user.email,
                name: user.name,
            });

            return user;
        }

        this.assertUserCanAuthenticate(existing, strategy);

        const updates: Partial<IUserDocument> = { lastLoginAt: now, lastLoginStrategy: strategy };
        if (profile.avatarUrl && !existing.avatar) updates.avatar = profile.avatarUrl;
        if ('emailVerified' in profile && profile.emailVerified && !existing.isEmailVerified)
            updates.isEmailVerified = true;

        const updated = await this.users.updateById(toUserId(existing), updates, options);
        return updated ?? existing;
    }

    async register(
        payload: RegisterInput,
        options?: RepositoryWriteOptions,
    ): Promise<RegisterResponse> {
        const existingUser = await this.users.findByEmailIncludingDeleted(payload.email, options);

        const expireDate = getExpiryDate(config.accountExpires);
        logger.debug(`Account expires at: ${expireDate}`);

        let userId: string;
        let email: string;
        let name: string;

        if (existingUser && existingUser.isDeleted) {
            const hashedPassword = await hashValue(payload.password);
            const now = new Date();

            const updatedUser = await this.users.updateAnyUser(toUserId(existingUser), {
                name: payload.name,
                email: payload.email.toLowerCase(),
                password: hashedPassword,
                isDeleted: false,
                deletedAt: null,
                registrationStrategy: AUTH_STRATEGIES.LOCAL,
                lastLoginAt: now,
                isEmailVerified: false,
                onboardingStep: ONBOARDING_STEPS.REGISTERED,
                isOnboardingCompleted: false,
                agreeTermsAndConditions: payload.agreeTermsAndConditions,
                termsAcceptedAt: now,
                failedLoginAttempts: 0,
                lockUntil: null,
                avatar: payload.avatar || '',
                phone: payload.phone || '',
                countryCode: '',
                address: '',
                expiresAt: expireDate,
            } as any);

            await this.tokens.revokeAllByUser(toUserId(existingUser), TOKEN_TYPES.REFRESH, options);
            await this.tokens.revokeAllByUser(
                toUserId(existingUser),
                TOKEN_TYPES.VERIFY_EMAIL,
                options,
            );

            userId = toUserId(updatedUser || existingUser);
            email = payload.email.toLowerCase();
            name = payload.name;

            const { otp, expiresAt } = getUniqueOtpCode({
                expiresInMinutes: config.auth.otpExpiresMinutes,
            });
            logger.debug(`OTP -> ${otp}`);

            await this.tokens.createToken(
                { userId, token: otp, type: TOKEN_TYPES.VERIFY_EMAIL, expiresAt },
                options,
            );

            eventBus.emit('user:registered', { userId, email, name });
            eventBus.emit('auth:otp-resend', { userId, email, name, otp, expiresAt });
        } else {
            const user = await this.userDomainService.createUser(
                {
                    ...payload,
                    registrationStrategy: AUTH_STRATEGIES.LOCAL,
                    lastLoginStrategy: AUTH_STRATEGIES.LOCAL,
                    lastLoginAt: new Date(),
                    expiresAt: expireDate,
                },
                options,
            );

            userId = toUserId(user);
            email = user.email;
            name = user.name;

            const { otp, expiresAt } = getUniqueOtpCode({
                expiresInMinutes: config.auth.otpExpiresMinutes,
            });

            await this.tokens.createToken(
                { userId, token: otp, type: TOKEN_TYPES.VERIFY_EMAIL, expiresAt },
                options,
            );

            eventBus.emit('user:registered', { userId, email, name });
            eventBus.emit('auth:otp-resend', { userId, email, name, otp, expiresAt });
        }

        // Create verification token for email verification
        const userDoc = await this.users.findById(userId, options);
        const verificationToken = userDoc ? this.createVerificationToken(userDoc) : '';

        return { userId, email, name, verificationToken };
    }

    async login(payload: LoginInput, options?: RepositoryWriteOptions): Promise<AuthResponse> {
        if (payload.provider && payload.token) return this.loginWithMobileSocial(payload, options);

        if (!payload.email || !payload.password)
            throw new BadRequestError('Email and password are required', 'INVALID_LOGIN');

        const user = await this.users.findByEmail(payload.email, options);
        if (!user) throw new NotFoundError(MESSAGES.AUTH.ACCOUNT_NOT_FOUND);

        if (!user || !user.password || user.isDeleted)
            throw new UnauthorizedError(MESSAGES.AUTH.INVALID_CREDENTIALS);
        if (isUserLocked(user)) throw new TooManyRequestsError(MESSAGES.AUTH.TOO_MANY_ATTEMPTS);

        const matched = await compareHash(payload.password, user.password);
        if (!matched) {
            await incrementFailedAttempts(user, options);
            throw new UnauthorizedError(MESSAGES.AUTH.INVALID_CREDENTIALS);
        }

        this.assertUserCanAuthenticate(user, AUTH_STRATEGIES.LOCAL);
        await this.assertUserIsApproved(user);
        await resetFailedAttempts(user, options);

        if (payload.notificationToken || payload.deviceType) {
            const updateData: Partial<IUserDocument> = {};
            if (payload.notificationToken) updateData.notificationToken = payload.notificationToken;
            if (payload.deviceType) updateData.deviceType = payload.deviceType;
            await this.users.updateById(toUserId(user), updateData, options);
        }

        const authedUser = await this.touchLastLogin(user, AUTH_STRATEGIES.LOCAL, options);
        const tokens = await this.issueTokenPair(authedUser, options);
        return await this.buildAuthResponse(authedUser, tokens);
    }

    private async loginWithMobileSocial(
        payload: LoginInput,
        options?: RepositoryWriteOptions,
    ): Promise<AuthResponse> {
        const { provider, token } = payload;
        if (!provider || !token)
            throw new BadRequestError('Provider and token are required', 'INVALID_LOGIN');

        let profile: GoogleProfile | AppleProfile;
        let strategy: AuthStrategy;

        if (provider === 'google') {
            profile = await verifyGoogleIdToken(token, options?.signal);
            strategy = AUTH_STRATEGIES.GOOGLE;
        } else if (provider === 'apple') {
            profile = await verifyAppleIdentityToken(token, options?.signal);
            strategy = AUTH_STRATEGIES.APPLE;
        } else {
            throw new BadRequestError('Unsupported provider', 'UNSUPPORTED_PROVIDER');
        }

        const user = await this.upsertSocialUser(profile, strategy, options);
        if (user.isDeleted) throw new UnauthorizedError(MESSAGES.AUTH.ACCOUNT_DELETED);
        this.assertUserIsApproved(user);

        if (payload.notificationToken || payload.deviceType) {
            const updateData: Partial<IUserDocument> = {};
            if (payload.notificationToken) updateData.notificationToken = payload.notificationToken;
            if (payload.deviceType) updateData.deviceType = payload.deviceType;
            await this.users.updateById(toUserId(user), updateData, options);
        }

        const tokens = await this.issueTokenPair(user, options);
        return await this.buildAuthResponse(user, tokens);
    }

    async refreshTokens(
        payload: RefreshInput,
        options?: RepositoryWriteOptions,
    ): Promise<AuthResponse> {
        let decoded: any;
        try {
            decoded = jwt.verify(payload.refreshToken, config.jwt.refreshSecret) as any;
        } catch {
            throw new UnauthorizedError(MESSAGES.AUTH.INVALID_TOKEN);
        }
        if (decoded.type !== AUTH_JWT_TYPES.REFRESH)
            throw new UnauthorizedError(MESSAGES.AUTH.INVALID_TOKEN);

        const userId = decoded.sub;
        const stored = await this.tokens.validateToken(
            userId,
            payload.refreshToken,
            TOKEN_TYPES.REFRESH,
            options,
        );
        if (!stored) throw new UnauthorizedError(MESSAGES.AUTH.INVALID_TOKEN);

        const user = await this.users.findById(userId, options as RepositoryQueryOptions);
        if (!user || user.isDeleted) throw new UnauthorizedError(MESSAGES.AUTH.INVALID_TOKEN);
        this.assertUserCanAuthenticate(user);

        await this.tokens.revokeToken(userId, payload.refreshToken, TOKEN_TYPES.REFRESH, options);
        const tokens = await this.issueTokenPair(user, options);
        return await this.buildAuthResponse(user, tokens);
    }

    async logout(accessToken: string, options?: RepositoryWriteOptions) {
        try {
            const decoded = jwt.verify(accessToken, config.jwt.accessSecret) as any;
            await this.tokens.revokeToken(decoded.sub, accessToken, TOKEN_TYPES.REFRESH, options);
        } catch {
            /* idempotent */
        }
    }

    async forgotPassword(
        payload: ForgotPasswordInput,
        options?: RepositoryWriteOptions,
    ): Promise<ForgotPasswordResponse> {
        const user = await this.users.findByEmail(payload.email, options);
        if (!user) throw new NotFoundError(MESSAGES.USER.NOT_FOUND);
        if (isUserLocked(user)) throw new TooManyRequestsError(MESSAGES.AUTH.TOO_MANY_ATTEMPTS);
        await resetFailedAttempts(user, options);

        const { otp: resetCode, expiresAt } = getUniqueOtpCode({
            expiresInMinutes: config.auth.otpExpiresMinutes,
        });

        logger.debug(`resetCode -> ${resetCode}`);

        await this.tokens.revokeAllByUser(toUserId(user), TOKEN_TYPES.RESET_PASSWORD, options);
        await this.tokens.createToken(
            {
                userId: toUserId(user),
                token: resetCode,
                type: TOKEN_TYPES.RESET_PASSWORD,
                expiresAt,
            },
            options,
        );

        const forgotPassToken = this.createForgotPassToken(user);

        eventBus.emit('auth:password-reset-requested', {
            userId: toUserId(user),
            email: user.email,
            name: user.name,
            otp: resetCode,
            expiresAt,
        });

        return {
            forgotPassToken,
            message: 'Reset code sent to your email.',
        };
    }

    async verifyResetCode(
        payload: VerifyResetCodeInput,
        options?: RepositoryWriteOptions,
    ): Promise<VerifyResetCodeResponse> {
        // Verify forgotPassToken
        let decoded: any;
        try {
            decoded = jwt.verify(payload.forgotPassToken, config.jwt.accessSecret) as any;
        } catch {
            throw new UnauthorizedError(MESSAGES.AUTH.INVALID_TOKEN);
        }
        if (decoded.type !== AUTH_JWT_TYPES.FORGOT_PASS)
            throw new UnauthorizedError(MESSAGES.AUTH.INVALID_TOKEN);

        const userId = decoded.sub;
        const user = await this.users.findById(userId, options);
        if (!user) throw new BadRequestError(MESSAGES.USER.NOT_FOUND);
        if (isUserLocked(user)) throw new TooManyRequestsError(MESSAGES.AUTH.TOO_MANY_ATTEMPTS);

        // Verify OTP
        const valid = await this.tokens.validateToken(
            userId,
            payload.otp,
            TOKEN_TYPES.RESET_PASSWORD,
            options,
        );
        if (!valid) {
            await incrementFailedAttempts(user, options);
            throw new BadRequestError(MESSAGES.AUTH.INVALID_TOKEN);
        }

        // Revoke the reset password tokens and issue a short-lived access token for password reset
        await this.tokens.revokeAllByUser(userId, TOKEN_TYPES.RESET_PASSWORD, options);

        // Issue a short-lived access token (type: reset) for resetting the password
        const accessToken = jwt.sign(
            {
                sub: userId,
                email: user.email,
                type: AUTH_JWT_TYPES.FORGOT_PASS,
                jti: crypto.randomUUID(),
            },
            config.jwt.accessSecret,
            { expiresIn: '15m' as never },
        );

        return { accessToken };
    }

    async changePassword(
        userId: string,
        payload: ChangePasswordInput,
        options?: RepositoryWriteOptions,
    ) {
        const user = await this.users.findByIdWithPassword(userId, options);
        if (!user) throw new BadRequestError(MESSAGES.USER.NOT_FOUND);

        if (user.password && !payload.isReset) {
            if (!payload.currentPassword) throw new BadRequestError('Current password is required');
            const matched = await compareHash(payload.currentPassword, user.password);
            if (!matched) throw new BadRequestError(MESSAGES.AUTH.OLD_PASSWORD_WRONG);
        }

        const hashed = await hashValue(payload.newPassword);
        await this.users.updateById(userId, { password: hashed }, options);

        if (payload.isReset) {
            eventBus.emit('auth:password-reset', {
                userId,
                email: user.email,
                name: user.name,
            });
        }
    }

    async resendOtp(payload: ResendOtpInput, options?: RepositoryWriteOptions) {
        const user = await this.users.findByEmail(payload.email, options);

        if (!user) throw new BadRequestError(MESSAGES.AUTH.ACCOUNT_NOT_FOUND);

        if (user.isEmailVerified) throw new BadRequestError(MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED);

        if (isUserLocked(user)) throw new TooManyRequestsError(MESSAGES.AUTH.TOO_MANY_ATTEMPTS);
        await incrementFailedAttempts(user, options);

        const { otp, expiresAt } = getUniqueOtpCode({
            expiresInMinutes: config.auth.otpExpiresMinutes,
        });
        logger.debug(`OTP -> ${otp}`);
        await this.tokens.createToken(
            { userId: toUserId(user), token: otp, type: TOKEN_TYPES.VERIFY_EMAIL, expiresAt },
            options,
        );

        eventBus.emit('auth:otp-resend', {
            userId: toUserId(user),
            email: user.email,
            name: user.name,
            otp,
            expiresAt,
        });
    }

    async verifyEmail(
        payload: VerifyEmailInput,
        options?: RepositoryWriteOptions,
    ): Promise<VerifyEmailResponse> {
        const user = await this.users.findByEmail(payload.email, options);
        if (!user) throw new BadRequestError(MESSAGES.AUTH.ACCOUNT_NOT_FOUND);

        if (user.isEmailVerified) throw new BadRequestError(MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED);

        if (isUserLocked(user)) throw new TooManyRequestsError(MESSAGES.AUTH.TOO_MANY_ATTEMPTS);

        const valid = await this.tokens.validateToken(
            toUserId(user),
            payload.otp,
            TOKEN_TYPES.VERIFY_EMAIL,
            options,
        );
        if (!valid) {
            await incrementFailedAttempts(user, options);
            throw new BadRequestError(MESSAGES.AUTH.INVALID_TOKEN);
        }

        const updatedUser = await this.users.updateById(
            toUserId(user),
            { isEmailVerified: true, onboardingStep: ONBOARDING_STEPS.VERIFIED, expiresAt: null },
            options,
        );

        if (!updatedUser) throw new BadRequestError(MESSAGES.AUTH.ACCOUNT_NOT_FOUND);

        await this.tokens.revokeAllByUser(toUserId(updatedUser), TOKEN_TYPES.VERIFY_EMAIL, options);

        // Create wallet for the user after email verification
        const wallet = await this.wallets.createWallet(
            new mongoose.Types.ObjectId(toUserId(updatedUser)),
            options,
        );
        await this.users.updateById(
            toUserId(updatedUser),
            { walletId: wallet._id as any } as any,
            options,
        );

        eventBus.emit('auth:email-verified', {
            userId: toUserId(updatedUser),
            email: updatedUser.email,
            name: updatedUser.name,
        });

        return {
            message: MESSAGES.AUTH.EMAIL_VERIFIED,
        };
    }

    async completeProfile(
        userId: string,
        payload: { avatar: string; phone: string; countryCode: string; address: string },
        options?: RepositoryWriteOptions,
    ) {
        const user = await this.users.findById(userId, options);
        if (!user) throw new NotFoundError(MESSAGES.USER.NOT_FOUND);

        if (user.isOnboardingCompleted)
            throw new BadRequestError(MESSAGES.AUTH.PROFILE_ONBOARDING_ALREADY_COMPLETE);

        await this.users.updateById(
            userId,
            {
                avatar: payload.avatar,
                phone: payload.phone,
                countryCode: payload.countryCode,
                address: payload.address,
                onboardingStep: ONBOARDING_STEPS.UNDER_REVIEW,
            },
            options,
        );

        return {
            onboarding: {
                step: ONBOARDING_STEPS.UNDER_REVIEW,
                isCompleted: false,
                nextRoute: '/onboarding/pending-review',
            },
        };
    }

    async resetPassword(
        userId: string,
        payload: ResetPasswordInput,
        options?: RepositoryWriteOptions,
    ) {
        const user = await this.users.findByIdWithPassword(userId, options);
        if (!user) throw new BadRequestError(MESSAGES.USER.NOT_FOUND);

        // Reset password
        const hashed = await hashValue(payload.newPassword);
        await this.users.updateById(userId, { password: hashed }, options);

        // Clean up refresh tokens
        await this.tokens.revokeAllByUser(userId, TOKEN_TYPES.REFRESH, options);

        eventBus.emit('auth:password-reset', {
            userId,
            email: user.email,
            name: user.name,
        });
    }
}

export const authService = new AuthService();
