import type { Document, Types } from 'mongoose';
import type { Role } from '@/core/constants/roles';
import type { AuthStrategy, UserStatus, OnboardingStep } from './user.constants';

export interface IUser {
    name: string;
    email: string;
    phone: string;
    countryCode: string;
    password: string;
    avatar?: string;
    address?: string;
    role: Role;
    status: UserStatus;
    registrationStrategy: AuthStrategy;
    lastLoginStrategy?: AuthStrategy;
    lastLoginAt?: Date;
    failedLoginAttempts: number;
    lockUntil?: Date | null;
    isEmailVerified: boolean;
    onboardingStep: OnboardingStep;
    isOnboardingCompleted: boolean;
    rejectionReason?: string | null;
    agreeTermsAndConditions: boolean;
    termsAcceptedAt?: Date;
    currentLevelId?: Types.ObjectId;
    lifetimeQualifiedSales: number;
    lifetimeQualifiedOrders: number;
    totalCommissionEarned: number;
    discountValue: number;
    commissionValue: number;
    walletId?: Types.ObjectId;
    notificationToken?: string;
    deviceType?: 'ios' | 'android' | 'web';
    isDeleted: boolean;
    deletedAt?: Date | null;
    expiresAt?: Date | undefined | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IUserDocument extends IUser, Document {
    id: string;
}

export interface CreateUserInput {
    name: string;
    email: string;
    password: string;
    phone?: string;
    avatar?: string;
    agreeTermsAndConditions: boolean;
    registrationStrategy?: AuthStrategy;
    lastLoginStrategy?: AuthStrategy;
    lastLoginAt?: Date;
    termsAcceptedAt?: Date;
    expiresAt?: Date
}

export interface VerifyEmailInput {
    email: string;
    otp: string;
}

export interface UpdateUserInput {
    name?: string;
    email?: string;
    phone?: string;
    countryCode?: string;
    password?: string;
    avatar?: string;
    address?: string;
    status?: UserStatus;
    role?: Role;
    isEmailVerified?: boolean;
    onboardingStep?: OnboardingStep;
    isOnboardingCompleted?: boolean;
    rejectionReason?: string | null;
    currentLevelId?: Types.ObjectId;
    lifetimeQualifiedSales?: number;
    lifetimeQualifiedOrders?: number;
    totalCommissionEarned?: number;
    discountValue?: number;
    commissionValue?: number;
    walletId?: Types.ObjectId;
    failedLoginAttempts?: number;
    lockUntil?: Date | null;
    isDeleted?: boolean;
    deletedAt?: Date | null;
    notificationToken?: string;
    expiresAt?: Date | null;
    deviceType?: 'ios' | 'android' | 'web';
}

export interface UpdateProfileInput {
    name?: string;
    phone?: string;
    countryCode?: string;
    avatar?: string;
    address?: string;
}

export interface ListUsersQuery {
    page?: number;
    limit?: number;
    sort?: string;
    role?: Role;
    status?: UserStatus;
    onboardingStep?: OnboardingStep;
    isOnboardingCompleted?: boolean;
    search?: string;
    isDeleted?: boolean;
}

export interface IUserSafe extends Omit<IUser, 'password'> {
    id: string;
}

export interface IUserWithTokens {
    user: IUserSafe;
    tokens: {
        accessToken: string;
        refreshToken: string;
    };
}

export interface IOnboardingStatus {
    onboardingStep: OnboardingStep;
    isOnboardingCompleted: boolean;
    nextRoute: string;
}

export interface ILoginResponse extends IUserWithTokens {
    onboarding: IOnboardingStatus;
}