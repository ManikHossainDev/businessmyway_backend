// import type { PlanSummary } from '../user-plan/user-plan.interface';
import type { IUserDocument } from './user.interface';

export const serializeSavedAddress = (address: {
    id?: string;
    _id?: unknown;
    label: string;
    houseNumber?: string;
    area?: string;
    location?: string;
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
    isDefault?: boolean;
}) => ({
    id: address.id || String(address._id || ''),
    label: address.label,
    houseNumber: address.houseNumber || address.line2 || '',
    area: address.area || address.city || '',
    location: address.location || address.line1 || '',
    postcode: address.postcode || '',
    isDefault: Boolean(address.isDefault),
});

export const serializeUser = (user: IUserDocument) => ({
    id: user.id || String((user as { _id?: unknown })._id || ''),
    name: user.name,
    email: user.email,
    phone: user.phone,
    countryCode: user.countryCode,
    avatar: user.avatar,
    identityDocument: user.identityDocument,
    identityDocumentType: user.identityDocumentType,
    address: user.address,
    savedAddresses: (user.savedAddresses || []).map((item) => serializeSavedAddress(item)),
    dateOfBirth: user.dateOfBirth,
    role: user.role,
    status: user.status,
    registrationStrategy: user.registrationStrategy,
    isEmailVerified: user.isEmailVerified,
    onboardingStep: user.onboardingStep,
    isOnboardingCompleted: user.isOnboardingCompleted,
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
        identityDocument: user.identityDocument,
        identityDocumentType: user.identityDocumentType,
        address: user.address,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
        status: user.status,
        registrationStrategy: user.registrationStrategy,
        isEmailVerified: user.isEmailVerified,
        onboardingStep: user.onboardingStep,
        isOnboardingCompleted: user.isOnboardingCompleted,
        notificationToken: user.notificationToken,
        deviceType: user.deviceType,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        activePlan: plan ?? null,
    }
)
