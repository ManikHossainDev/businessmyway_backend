import { config } from '@/config';
import { ROLES } from '@/core/constants/roles';
import { UserModel } from '@/modules/user/user.model';
import { AUTH_STRATEGIES, USER_STATUS, ONBOARDING_STEPS } from '@/modules/user/user.constants';
import { compareHash, hashValue } from '@/shared/utils/hash';
import { logger } from '@/infrastructure/logger/winston.logger';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';

const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_ADMIN_NAME = 'Super Admin';
const DEFAULT_ADMIN_PASSWORD = 'ChangeMe@12345';

interface SeedConfig {
    email: string;
    name: string;
    password: string;
}

const getSeedConfig = (): SeedConfig => {
    const email = (process.env.SUPER_ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).trim().toLowerCase();
    const name = process.env.SUPER_ADMIN_NAME?.trim() ?? DEFAULT_ADMIN_NAME;
    const password = process.env.SUPER_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
    return { email, name, password };
};

export const seedSuperAdmin = async (): Promise<void> => {
    const seedConfig = getSeedConfig();

    if (config.isProduction) {
        const errors: string[] = [];
        if (!process.env.SUPER_ADMIN_PASSWORD) errors.push('SUPER_ADMIN_PASSWORD is required in production');
        if (errors.length > 0) throw new Error(errors.join('. '));
    }

    await connectDatabase();

    try {
        const existing = await UserModel.findOne({ email: seedConfig.email }).select('+password');
        const hashedPassword = await hashValue(seedConfig.password);

        const baseData = {
            name: seedConfig.name,
            email: seedConfig.email,
            phone: '',
            countryCode: '',
            password: hashedPassword,
            role: ROLES.SUPER_ADMIN,
            status: USER_STATUS.ACTIVE,
            registrationStrategy: AUTH_STRATEGIES.LOCAL,
            isEmailVerified: true,
            isDeleted: false,
            deletedAt: null,
            agreeTermsAndConditions: true,
            termsAcceptedAt: new Date(),
            onboardingStep: ONBOARDING_STEPS.APPROVED,
            isOnboardingCompleted: true,
            failedLoginAttempts: 0,
            lockUntil: null,
        };

        if (!existing) {
            await UserModel.create(baseData);
            logger.info('✅ Admin user created.', { email: seedConfig.email, name: seedConfig.name });
            return;
        }

        const shouldUpdatePassword = existing.password
            ? !(await compareHash(seedConfig.password, existing.password))
            : true;

        await UserModel.updateOne({ _id: existing._id }, {
            $set: {
                name: seedConfig.name,
                role: ROLES.SUPER_ADMIN,
                status: USER_STATUS.ACTIVE,
                registrationStrategy: AUTH_STRATEGIES.LOCAL,
                isEmailVerified: true,
                isDeleted: false,
                agreeTermsAndConditions: true,
                onboardingStep: ONBOARDING_STEPS.APPROVED,
                isOnboardingCompleted: true,
                failedLoginAttempts: 0,
                lockUntil: null,
                ...(shouldUpdatePassword ? { password: hashedPassword } : {}),
            },
        });

        logger.info('✅ Admin user normalized.', {
            email: seedConfig.email,
            name: seedConfig.name,
            passwordUpdated: shouldUpdatePassword,
        });
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    void seedSuperAdmin()
        .then(() => { logger.info('🎉 Admin seed completed successfully.'); process.exit(0); })
        .catch((error) => {
            logger.error('❌ Admin seed failed.', { error: error instanceof Error ? error.message : String(error) });
            process.exit(1);
        });
}