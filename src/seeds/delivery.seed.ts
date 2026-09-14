import { DeliveryModel } from '@/modules/delivery/delivery.model';
import { logger } from '@/infrastructure/logger/winston.logger';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';

export const seedDelivery = async (): Promise<void> => {
    await connectDatabase();
    try {
        const existing = await DeliveryModel.findOne();
        if (!existing) {
            await DeliveryModel.create({
                maximumPrice: 200,
                standardDelivery: {
                    day: '3-5 Business Days',
                    price: 4.99,
                },
                expressDelivery: {
                    day: '1-2 Business Days',
                    price: 9.99,
                },
            });
            logger.info('✅ Delivery configuration seeded successfully');
        } else {
            logger.info('ℹ️ Delivery configuration already exists');
        }
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    void seedDelivery()
        .then(() => {
            logger.info('🎉 Delivery seed completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Delivery seed failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}
