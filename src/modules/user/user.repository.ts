import type { ClientSession } from 'mongoose';
import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '@/core/interfaces/repository.interface';
import type {
    OffsetPaginationParams,
    OffsetPaginationResult,
} from '@/core/types/pagination.types';
import { BaseMongooseRepository } from '@/infrastructure/database/base.repository';
import { USER_STATUS } from './user.constants';
import type { IUserDocument, UpdateUserInput } from './user.interface';
import { UserModel } from './user.model';

const createAbortError = (): Error => {
    const abortError = new Error('Operation aborted.');
    abortError.name = 'AbortError';
    return abortError;
};

const withAbort = async <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (!signal) return promise;
    if (signal.aborted) throw createAbortError();
    return new Promise<T>((resolve, reject) => {
        const abortHandler = (): void => reject(createAbortError());
        signal.addEventListener('abort', abortHandler, { once: true });
        promise
            .then(resolve)
            .catch(reject)
            .finally(() => signal.removeEventListener('abort', abortHandler));
    });
};

const withNotDeleted = (filter: Record<string, unknown> = {}): Record<string, unknown> => ({
    ...filter,
    isDeleted: false,
});

const resolveSession = (options?: RepositoryWriteOptions): { session?: ClientSession } | undefined =>
    options?.session ? { session: options.session as ClientSession } : undefined;

export class UserRepository extends BaseMongooseRepository<IUserDocument> {
    constructor() {
        super(UserModel);
    }

    async findById(id: string, options?: RepositoryQueryOptions): Promise<IUserDocument | null> {
        return withAbort(
            this.model.findOne(withNotDeleted({ _id: id })).lean<IUserDocument>() as Promise<IUserDocument | null>,
            options?.signal,
        );
    }

    async findByIdWithPassword(id: string, options?: RepositoryQueryOptions): Promise<IUserDocument | null> {
        return withAbort(
            this.model.findOne(withNotDeleted({ _id: id })).select('+password').lean<IUserDocument>() as Promise<IUserDocument | null>,
            options?.signal,
        );
    }

    async findOne(filter: Record<string, unknown>, options?: RepositoryQueryOptions): Promise<IUserDocument | null> {
        return withAbort(
            this.model.findOne(withNotDeleted(filter)).lean<IUserDocument>() as Promise<IUserDocument | null>,
            options?.signal,
        );
    }

    async find(filter: Record<string, unknown>, options?: RepositoryQueryOptions): Promise<IUserDocument[]> {
        return withAbort(
            this.model.find(withNotDeleted(filter)).lean<IUserDocument[]>() as Promise<IUserDocument[]>,
            options?.signal,
        );
    }

    async count(filter: Record<string, unknown>, options?: RepositoryQueryOptions): Promise<number> {
        return withAbort(
            this.model.countDocuments(withNotDeleted(filter)) as Promise<number>,
            options?.signal,
        );
    }

    async countAll(filter: Record<string, unknown>, options?: RepositoryQueryOptions): Promise<number> {
        return withAbort(
            this.model.countDocuments(filter) as Promise<number>,
            options?.signal,
        );
    }

    async updateById(id: string, data: Partial<UpdateUserInput>, options?: RepositoryWriteOptions): Promise<IUserDocument | null> {
        return withAbort(
            this.model
                .findOneAndUpdate(withNotDeleted({ _id: id }), data, {
                    new: true,
                    runValidators: true,
                    ...resolveSession(options),
                })
                .lean<IUserDocument>() as Promise<IUserDocument | null>,
            options?.signal,
        );
    }

    async paginateOffset(
        filter: Record<string, unknown>,
        params: OffsetPaginationParams,
        options?: RepositoryQueryOptions,
    ): Promise<OffsetPaginationResult<IUserDocument>> {
        return withAbort(
            this.model.paginateOffset(filter, params) as Promise<OffsetPaginationResult<IUserDocument>>,
            options?.signal,
        );
    }

    async findByEmail(email: string, options?: RepositoryQueryOptions): Promise<IUserDocument | null> {
        return withAbort(
            this.model
                .findOne(withNotDeleted({ email: email.toLowerCase() }))
                .select('+password')
                .lean<IUserDocument>() as Promise<IUserDocument | null>,
            options?.signal,
        );
    }

    async findByEmailIncludingDeleted(email: string, options?: RepositoryQueryOptions): Promise<IUserDocument | null> {
        return withAbort(
            this.model
                .findOne({ email: email.toLowerCase() })
                .select('+password')
                .lean<IUserDocument>() as Promise<IUserDocument | null>,
            options?.signal,
        );
    }

    async existsByEmail(email: string): Promise<boolean> {
        const count = await this.model.countDocuments({ email: email.toLowerCase(), isDeleted: false });
        return count > 0;
    }

    async softDeleteById(id: string, options?: RepositoryWriteOptions): Promise<boolean> {
        const result = await withAbort(
            this.model.updateOne(
                withNotDeleted({ _id: id }),
                {
                    $set: { isDeleted: true, deletedAt: new Date(), status: USER_STATUS.INACTIVE },
                    $unset: { lastLoginStrategy: '' },
                },
                resolveSession(options),
            ) as Promise<{ modifiedCount: number }>,
            options?.signal,
        );
        return result.modifiedCount > 0;
    }

    async updateAnyUser(id: string, data: Record<string, unknown>, options?: RepositoryWriteOptions): Promise<IUserDocument | null> {
        return withAbort(
            this.model
                .findOneAndUpdate({ _id: id }, data, { new: true, runValidators: true, ...resolveSession(options) })
                .lean<IUserDocument>() as Promise<IUserDocument | null>,
            options?.signal,
        );
    }
}

export const userRepository = new UserRepository();
