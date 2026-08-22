import { SettingModel } from '@/modules/settings/settings.model';
import { logger } from '@/infrastructure/logger/winston.logger';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';

const settings = [
    {
        slug: 'privacy_policy',
        title: 'Privacy Policy',
        content: '<p>Your privacy is important to us. This privacy policy outlines how we collect, use, and protect your personal information.</p>',
        isPublic: true,
    },
    {
        slug: 'terms_and_conditions',
        title: 'Terms and Conditions',
        content: '<p>These terms and conditions govern your use of our platform. By using our services, you agree to these terms.</p>',
        isPublic: true,
    },
    {
        slug: 'about_us',
        title: 'About Us',
        content: '<p>We are a leading platform for property claims management, dedicated to providing fast and reliable service to landlords, homeowners, and renters.</p>',
        isPublic: true,
    }
];

export const seedSettings = async (): Promise<void> => {
    await connectDatabase();

    try {
        for (const setting of settings) {
            await SettingModel.findOneAndUpdate(
                { slug: setting.slug },
                setting,
                { upsert: true, new: true },
            );
        }
        logger.info('✅ Settings seeded successfully', { count: settings.length });
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    void seedSettings()
        .then(() => { logger.info('🎉 Settings seed completed successfully.'); process.exit(0); })
        .catch((error) => {
            logger.error('❌ Settings seed failed.', { error: error instanceof Error ? error.message : String(error) });
            process.exit(1);
        });
}
