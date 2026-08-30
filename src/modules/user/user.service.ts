import { ONBOARDING_STEPS } from './user.constants';
import type {
    CreateUserInput,
    IUserDocument,
    UpdateProfileInput,
    UpdateUserInput,
} from './user.interface';
import { ROLES } from '@/core/constants/roles';
import { hashValue } from '@/shared/utils/hash';
import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '@/core/interfaces/repository.interface';
import { MESSAGES } from '@/core/constants/messages';
import { BadRequestError, ConflictError, NotFoundError } from '@/core/errors';
import { userRepository, type UserRepository } from './user.repository';
import type { OffsetPaginationParams, OffsetPaginationResult } from '@/core/types/pagination.types';
import { UserModel } from './user.model';
import type { SavedAddressBody } from './user.validation';
import { eventBus } from '@/infrastructure/events/event-bus';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class UserService {
    constructor(private readonly repository: UserRepository = userRepository) {}

    async createUser(
        payload: CreateUserInput,
        options?: RepositoryWriteOptions,
    ): Promise<IUserDocument> {
        const emailTaken = await this.repository.existsByEmail(payload.email);
        if (emailTaken)
            throw new ConflictError(MESSAGES.AUTH.EMAIL_ALREADY_EXISTS, 'USER_EMAIL_EXISTS');

        const hashedPassword = await hashValue(payload.password);

        const user = await this.repository.create(
            {
                name: payload.name,
                email: payload.email.toLowerCase(),
                password: hashedPassword,
                role: ROLES.USER,
                registrationStrategy: payload.registrationStrategy ?? 'local',
                isEmailVerified: false,
                onboardingStep: ONBOARDING_STEPS.REGISTERED,
                isOnboardingCompleted: false,
                agreeTermsAndConditions: payload.agreeTermsAndConditions,
                termsAcceptedAt: payload.termsAcceptedAt ?? new Date(),
                phone: payload.phone || '',
                avatar: payload.avatar || '',
                identityDocument: payload.identityDocument || '',
                identityDocumentType: payload.identityDocumentType || 'nid',
                dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : undefined,
                expiresAt: payload.expiresAt,
            } as Partial<IUserDocument>,
            options,
        );

        return user;
    }

    async getById(id: string, options?: RepositoryQueryOptions): Promise<IUserDocument> {
        const user = await this.repository.findById(id, options);
        if (!user) throw new NotFoundError(MESSAGES.USER.NOT_FOUND, 'USER_NOT_FOUND');
        return user;
    }

    async listUsers(
        filters: Record<string, unknown>,
        pagination: OffsetPaginationParams,
        options?: RepositoryQueryOptions,
    ): Promise<OffsetPaginationResult<IUserDocument>> {
        const query: Record<string, unknown> = { isDeleted: false };

        if (filters.role) query.role = filters.role;
        if (filters.status) query.status = filters.status;
        if (filters.onboardingStep) query.onboardingStep = filters.onboardingStep;
        if (typeof filters.isOnboardingCompleted === 'boolean') {
            query.isOnboardingCompleted = filters.isOnboardingCompleted;
        }

        if (filters.search) {
            const safe = escapeRegex(String(filters.search).trim());
            if (safe) {
                query.$or = [
                    { name: { $regex: safe, $options: 'i' } },
                    { email: { $regex: safe, $options: 'i' } },
                ];
            }
        }

        return this.repository.paginateOffset(query, pagination, options);
    }

    async updateById(
        id: string,
        payload: UpdateUserInput,
        options?: RepositoryWriteOptions,
    ): Promise<IUserDocument> {
        const updated = await this.repository.updateById(id, payload, options);
        if (!updated) throw new NotFoundError(MESSAGES.USER.NOT_FOUND, 'USER_NOT_FOUND');
        return updated;
    }

    async updateProfile(
        userId: string,
        payload: UpdateProfileInput,
        options?: RepositoryWriteOptions,
    ): Promise<IUserDocument> {
        return this.updateById(userId, payload, options);
    }

    async deleteById(id: string, options?: RepositoryWriteOptions): Promise<void> {
        const deleted = await this.repository.softDeleteById(id, options);
        if (!deleted) throw new NotFoundError(MESSAGES.USER.NOT_FOUND, 'USER_NOT_FOUND');
    }

    async addAddress(userId: string, payload: SavedAddressBody): Promise<IUserDocument> {
        const user = await UserModel.findById(userId);
        if (!user) throw new NotFoundError(MESSAGES.USER.NOT_FOUND, 'USER_NOT_FOUND');

        const addresses = user.savedAddresses || [];
        const makeDefault = payload.isDefault || addresses.length === 0;
        if (makeDefault) {
            addresses.forEach((item) => {
                item.isDefault = false;
            });
        }
        user.savedAddresses = [
            ...addresses,
            {
                label: payload.label,
                houseNumber: payload.houseNumber,
                area: payload.area,
                location: payload.location,
                postcode: payload.postcode || '',
                isDefault: makeDefault,
            },
        ];
        await user.save();
        return user;
    }

    async updateAddress(userId: string, addressId: string, payload: SavedAddressBody): Promise<IUserDocument> {
        const user = await UserModel.findById(userId);
        if (!user) throw new NotFoundError(MESSAGES.USER.NOT_FOUND, 'USER_NOT_FOUND');

        const address = user.savedAddresses?.find((item) => String(item._id) === addressId);
        if (!address) throw new NotFoundError(MESSAGES.USER.ADDRESS_NOT_FOUND, 'USER_ADDRESS_NOT_FOUND');

        address.label = payload.label;
        address.houseNumber = payload.houseNumber;
        address.area = payload.area;
        address.location = payload.location;
        address.postcode = payload.postcode || '';

        if (payload.isDefault) {
            user.savedAddresses?.forEach((item) => {
                item.isDefault = String(item._id) === addressId;
            });
        }

        await user.save();
        return user;
    }

    async removeAddress(userId: string, addressId: string): Promise<IUserDocument> {
        const user = await UserModel.findById(userId);
        if (!user) throw new NotFoundError(MESSAGES.USER.NOT_FOUND, 'USER_NOT_FOUND');

        const current = user.savedAddresses || [];
        const address = current.find((item) => String(item._id) === addressId);
        if (!address) throw new NotFoundError(MESSAGES.USER.ADDRESS_NOT_FOUND, 'USER_ADDRESS_NOT_FOUND');

        const next = current.filter((item) => String(item._id) !== addressId);
        const firstRemaining = next[0];
        if (address.isDefault && firstRemaining) {
            firstRemaining.isDefault = true;
        }
        user.savedAddresses = next;
        await user.save();
        return user;
    }

    async setDefaultAddress(userId: string, addressId: string): Promise<IUserDocument> {
        const user = await UserModel.findById(userId);
        if (!user) throw new NotFoundError(MESSAGES.USER.NOT_FOUND, 'USER_NOT_FOUND');

        const address = user.savedAddresses?.find((item) => String(item._id) === addressId);
        if (!address) throw new NotFoundError(MESSAGES.USER.ADDRESS_NOT_FOUND, 'USER_ADDRESS_NOT_FOUND');

        user.savedAddresses?.forEach((item) => {
            item.isDefault = String(item._id) === addressId;
        });
        await user.save();
        return user;
    }

    async approveUser(id: string, options?: RepositoryWriteOptions): Promise<IUserDocument> {
        const user = await this.getById(id, options);
        if (user.role === ROLES.SUPER_ADMIN) {
            throw new BadRequestError('Admin accounts do not require approval.', 'ADMIN_APPROVAL_NOT_ALLOWED');
        }
        if (user.onboardingStep === ONBOARDING_STEPS.APPROVED && user.isOnboardingCompleted) {
            throw new BadRequestError(MESSAGES.USER.ALREADY_APPROVED, 'USER_ALREADY_APPROVED');
        }

        const updated = await this.updateById(
            id,
            {
                onboardingStep: ONBOARDING_STEPS.APPROVED,
                isOnboardingCompleted: true,
                rejectionReason: null,
            },
            options,
        );

        eventBus.emit('user:profile-approved', {
            userId: updated.id || String(updated._id),
            email: updated.email,
            name: updated.name,
        });

        return updated;
    }
}

export const userService = new UserService();
