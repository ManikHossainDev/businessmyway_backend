import { ConflictError, NotFoundError } from '../../../../src/core/errors';
import { ROLES } from '../../../../src/core/constants/roles';
import * as hashUtils from '../../../../src/shared/utils/hash';
import { AUTH_STRATEGIES, USER_STATUS } from '../../../../src/modules/user/user.constants';
import type { UserRepository } from '../../../../src/modules/user/user.repository';
import { UserService } from '../../../../src/modules/user/user.service';
import { buildUser } from '../../../factories/user.factory';

const createRepositoryMock = (): jest.Mocked<Partial<UserRepository>> => {
    return {
        existsByEmail: jest.fn(),
        create: jest.fn(),
        findById: jest.fn(),
        updateById: jest.fn(),
        softDeleteById: jest.fn(),
        paginateOffset: jest.fn(),
    };
};

describe('UserService', () => {
    it('creates a user with hashed password and default role', async () => {
        const repository = createRepositoryMock();
        (repository.existsByEmail as jest.Mock).mockResolvedValue(false);
        (repository.create as jest.Mock).mockImplementation(
            async (payload: Parameters<UserRepository['create']>[0]) => buildUser(payload),
        );
        jest.spyOn(hashUtils, 'hashValue').mockResolvedValue('hashed-value');

        const service = new UserService(repository as UserRepository);
        const user = await service.createUser({
            name: 'Alice Example',
            email: 'alice@example.com',
            password: 'Password@123',
            agreeTermsAndConditions: true,
        });

        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'alice@example.com',
                password: 'hashed-value',
                role: ROLES.USER,
                status: USER_STATUS.INACTIVE,
                registrationStrategy: AUTH_STRATEGIES.LOCAL,
                isEmailVerified: false,
                isDeleted: false,
                deletedAt: null,
            }),
            undefined,
        );
        expect(user.email).toBe('alice@example.com');
    });

    it('throws ConflictError when email already exists', async () => {
        const repository = createRepositoryMock();
        (repository.existsByEmail as jest.Mock).mockResolvedValue(true);
        const service = new UserService(repository as UserRepository);

        await expect(
            service.createUser({
                name: 'Alice Example',
                email: 'alice@example.com',
                password: 'Password@123',
                agreeTermsAndConditions: true,
            }),
        ).rejects.toBeInstanceOf(ConflictError);
    });

    it('throws NotFoundError when user is missing', async () => {
        const repository = createRepositoryMock();
        (repository.findById as jest.Mock).mockResolvedValue(null);
        const service = new UserService(repository as UserRepository);

        await expect(service.getById('507f1f77bcf86cd799439011')).rejects.toBeInstanceOf(
            NotFoundError,
        );
    });
});
