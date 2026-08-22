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
import { ConflictError, NotFoundError } from '@/core/errors';
import { userRepository, type UserRepository } from './user.repository';
import type { OffsetPaginationParams, OffsetPaginationResult } from '@/core/types/pagination.types';

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
        const query: Record<string, unknown> = { ...filters };

        if (filters.search) {
            const safe = escapeRegex(filters.search as string);
            query.$or = [
                { name: { $regex: safe, $options: 'i' } },
                { email: { $regex: safe, $options: 'i' } },
            ];
            delete query.search;
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
}

export const userService = new UserService();
