import mongoose, { Schema } from 'mongoose';
import { ONBOARDING_STEPS, AUTH_STRATEGIES, USER_DEFAULTS, USER_STATUS } from './user.constants';
import type { IUserDocument } from './user.interface';
import { ALL_ROLES, ROLES } from '@/core/constants/roles';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';

const userSchema = new Schema<IUserDocument>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
        },
        phone: {
            type: String,
            trim: true,
            default: '',
        },
        countryCode: {
            type: String,
            trim: true,
            default: '',
        },
        password: {
            type: String,
            required: true,
            select: false,
            minlength: 8,
        },
        role: {
            type: String,
            enum: ALL_ROLES,
            default: ROLES.USER,
            index: true,
        },
        status: {
            type: String,
            enum: Object.values(USER_STATUS),
            default: USER_DEFAULTS.STATUS,
            index: true,
        },
        registrationStrategy: {
            type: String,
            enum: Object.values(AUTH_STRATEGIES),
            default: USER_DEFAULTS.REGISTRATION_STRATEGY,
            index: true,
        },
        lastLoginStrategy: {
            type: String,
            enum: Object.values(AUTH_STRATEGIES),
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            default: USER_DEFAULTS.IS_DELETED,
            index: true,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        avatar: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        lastLoginAt: {
            type: Date,
        },
        failedLoginAttempts: {
            type: Number,
            default: 0,
            min: 0,
        },
        lockUntil: {
            type: Date,
        },
        onboardingStep: {
            type: String,
            enum: Object.values(ONBOARDING_STEPS),
            default: ONBOARDING_STEPS.REGISTERED,
            index: true,
        },
        isOnboardingCompleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        rejectionReason: {
            type: String,
            default: null,
        },
        agreeTermsAndConditions: {
            type: Boolean,
            required: true,
            default: false,
        },
        termsAcceptedAt: {
            type: Date,
        },
        currentLevelId: {
            type: Schema.Types.ObjectId,
            ref: 'Level',
            default: null,
        },
        lifetimeQualifiedSales: {
            type: Number,
            default: 0,
            min: 0,
        },
        lifetimeQualifiedOrders: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalCommissionEarned: {
            type: Number,
            default: 0,
            min: 0,
        },
        discountValue: {
            type: Number,
            default: 0,
            min: 0,
        },
        commissionValue: {
            type: Number,
            default: 0,
            min: 0,
        },
        walletId: {
            type: Schema.Types.ObjectId,
            ref: 'Wallet',
            default: null,
        },
        notificationToken: {
            type: String,
            trim: true,
        },
        deviceType: {
            type: String,
            enum: ['ios', 'android', 'web'],
        },
        expiresAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
    },
);

userSchema.plugin(toJSONPlugin);
userSchema.plugin(paginatePlugin);

userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
userSchema.index({ isDeleted: 1, createdAt: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ name: 'text', email: 'text' });
userSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, partialFilterExpression: { isEmailVerified: false } },
);

export const UserModel = mongoose.model<IUserDocument, PaginateModel<IUserDocument>>(
    'User',
    userSchema,
    'users',
);
