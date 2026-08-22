// import type { PlanSummary } from '../user-plan/user-plan.interface';
import type { IUserDocument } from './user.interface';

export const serializeUser = (user: IUserDocument) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    countryCode: user.countryCode,
    avatar: user.avatar,
    address: user.address,
    role: user.role,
    status: user.status,
    registrationStrategy: user.registrationStrategy,
    isEmailVerified: user.isEmailVerified,
    onboardingStep: user.onboardingStep,
    isOnboardingCompleted: user.isOnboardingCompleted,
    discountValue: user.discountValue,
    commissionValue: user.commissionValue,
    notificationToken: user.notificationToken,
    deviceType: user.deviceType,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

export const serializeUserWithActivePlan = (user: IUserDocument, plan: any | null) => (
    {
        id: user.id ?? (user as any)._id?.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        countryCode: user.countryCode,
        avatar: user.avatar,
        address: user.address,
        role: user.role,
        status: user.status,
        registrationStrategy: user.registrationStrategy,
        isEmailVerified: user.isEmailVerified,
        onboardingStep: user.onboardingStep,
        isOnboardingCompleted: user.isOnboardingCompleted,
        discountValue: user.discountValue,
        commissionValue: user.commissionValue,
        notificationToken: user.notificationToken,
        deviceType: user.deviceType,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        activePlan: plan ?? null,
    }
)
