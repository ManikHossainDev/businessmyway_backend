import { logger } from '@/infrastructure/logger/winston.logger';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';
import { BrandModel } from '@/modules/brands/brand.model';
import { CategoryModel } from '@/modules/category/category.model';

const BRAND_CATEGORY_FIXES: Record<string, string> = {
    Marlboro: 'Cigarettes',
    Camel: 'Cigarettes',
    Montecristo: 'Cigars',
    Montecristos: 'Cigars',
    Cohiba: 'Cigars',
    Partagás: 'Cigars',
    Davidoff: 'Tobacco',
    Dunhill: 'Accessories',
};

export const fixBrandCategories = async (): Promise<void> => {
    await connectDatabase();

    try {
        const categories = await CategoryModel.find().lean();
        const categoryByName = new Map(
            categories.map((category) => [category.name.trim().toLowerCase(), category]),
        );

        let updated = 0;
        let skipped = 0;

        for (const [title, categoryName] of Object.entries(BRAND_CATEGORY_FIXES)) {
            const category = categoryByName.get(categoryName.toLowerCase());
            if (!category) {
                logger.warn(`Category "${categoryName}" not found — skipped ${title}.`);
                skipped += 1;
                continue;
            }

            const brand = await BrandModel.findOne({
                title: { $regex: `^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
            });

            if (!brand) {
                logger.warn(`Brand "${title}" not found — skipped.`);
                skipped += 1;
                continue;
            }

            if (String(brand.category) === String(category._id)) {
                continue;
            }

            brand.set('category', category._id);
            await brand.save();
            updated += 1;
            logger.info(`Moved "${brand.title}" → ${category.name}`);
        }

        logger.info('Brand categories fixed', { updated, skipped });
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    void fixBrandCategories()
        .then(() => process.exit(0))
        .catch((error) => {
            logger.error('Brand category fix failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}
