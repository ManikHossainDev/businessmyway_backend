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
    },
    {
        slug: 'refund_policy',
        title: 'Refund Policy',
        content: '<p>If you are not satisfied with your order, you may request a refund or replacement subject to the conditions below.</p><ul><li>Unopened products may be returned within 14 days of delivery.</li><li>Damaged or incorrect items must be reported within 48 hours of receipt, with photos if possible.</li><li>Opened tobacco products cannot be returned for hygiene and legal reasons, unless they arrived damaged or incorrect.</li><li>Approved refunds are issued to the original payment method within 5–10 business days.</li></ul>',
        isPublic: true,
    },
    {
        slug: 'shipping_policy',
        title: 'Shipping Policy',
        content: '<p>We ship age-restricted products to eligible adult customers only.</p><ul><li>Orders are typically processed within 1–2 business days.</li><li>Standard UK delivery takes 2–5 business days; tracked and express options may be available at checkout.</li><li>An adult aged 18+ must be available to receive the order. ID may be requested on delivery.</li><li>We cannot deliver to PO boxes or addresses where age verification is not possible.</li></ul>',
        isPublic: true,
    },
];

export const seedSettings = async (): Promise<void> => {
    await connectDatabase();

    try {
        for (const setting of settings) {
            await SettingModel.updateOne(
                { slug: setting.slug },
                { $setOnInsert: setting },
                { upsert: true },
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
