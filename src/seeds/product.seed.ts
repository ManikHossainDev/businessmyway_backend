
import { CategoryModel } from '@/modules/category/category.model';
import { logger } from '@/infrastructure/logger/winston.logger';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';
import { getAttributeFields, type ProductCategorySlug } from '@/modules/products/product.attributes';
import { ProductModel } from '@/modules/products/product.model';
import { BrandModel } from '@/modules/brands/brand.model';

const slugify = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

const PLACEHOLDER_IMAGE = (label: string) =>
    `https://placehold.co/600x600?text=${encodeURIComponent(label)}`;

interface SeedProduct {
    name: string;
    sku: string;
    price: number;
    stockQty: number;
    description: string;
    attributes: Record<string, string>;
    isFeatured?: boolean;
}

const PRODUCTS_BY_CATEGORY: Record<ProductCategorySlug, SeedProduct[]> = {
    cigarettes: [
        {
            name: 'Classic Full Strength 20s',
            sku: 'CIG-CLS-FS-20',
            price: 12.5,
            stockQty: 120,
            description: 'A bold, full-strength classic blend in a standard 20-pack.',
            attributes: { strength: 'Full Strength', flavour: 'Classic', packSize: '20 Pack' },
            isFeatured: true,
        },
        {
            name: 'Menthol Light 20s',
            sku: 'CIG-MEN-LT-20',
            price: 12,
            stockQty: 90,
            description: 'A cool, light-strength menthol blend for a smoother draw.',
            attributes: { strength: 'Light', flavour: 'Menthol', packSize: '20 Pack' },
            isFeatured: true,
        },
        {
            name: 'Vanilla Ultra Light Carton',
            sku: 'CIG-VAN-UL-C10',
            price: 105,
            stockQty: 40,
            description: 'Ultra-light vanilla flavoured cigarettes, carton of 10 packs.',
            attributes: { strength: 'Ultra Light', flavour: 'Vanilla', packSize: 'Carton x 10' },
        },
        {
            name: 'Medium Classic 10s',
            sku: 'CIG-MED-CLS-10',
            price: 7.5,
            stockQty: 110,
            description: 'A balanced medium-strength classic blend in a 10-pack.',
            attributes: { strength: 'Medium', flavour: 'Classic', packSize: '10 Pack' },
        },
        {
            name: 'Full Strength Menthol Carton',
            sku: 'CIG-FS-MEN-C10',
            price: 108,
            stockQty: 28,
            description: 'Full-strength menthol cigarettes, carton of 10 packs.',
            attributes: { strength: 'Full Strength', flavour: 'Menthol', packSize: 'Carton x 10' },
        },
    ],
    cigars: [
        {
            name: 'Robusto Natural — Cuba',
            sku: 'CGR-ROB-NAT-CU',
            price: 45,
            stockQty: 60,
            description: 'A classic Cuban robusto with a smooth natural wrapper.',
            attributes: {
                vitola: 'Robusto',
                origin: 'Cuba',
                wrapperColor: 'Natural',
                packSize: '10 Pack',
            },
            isFeatured: true,
        },
        {
            name: 'Churchill Maduro — Nicaragua',
            sku: 'CGR-CHU-MAD-NI',
            price: 78,
            stockQty: 35,
            description: 'A full-bodied Nicaraguan Churchill with a rich maduro wrapper.',
            attributes: {
                vitola: 'Churchill',
                origin: 'Nicaragua',
                wrapperColor: 'Maduro',
                packSize: '20 Pack',
            },
            isFeatured: true,
        },
        {
            name: 'Toro Colorado — Dominican Republic',
            sku: 'CGR-TOR-COL-DR',
            price: 42,
            stockQty: 50,
            description: 'A well-balanced Dominican toro with a colorado wrapper.',
            attributes: {
                vitola: 'Toro',
                origin: 'Dominican Republic',
                wrapperColor: 'Colorado',
                packSize: '10 Pack',
            },
        },
        {
            name: 'Corona Claro — Honduras',
            sku: 'CGR-COR-CLA-HN',
            price: 36,
            stockQty: 55,
            description: 'A refined Honduran corona with a light claro wrapper.',
            attributes: {
                vitola: 'Corona',
                origin: 'Honduras',
                wrapperColor: 'Claro',
                packSize: '10 Pack',
            },
        },
        {
            name: 'Panetela Natural Carton — Cuba',
            sku: 'CGR-PAN-NAT-C10',
            price: 210,
            stockQty: 18,
            description: 'Slim Cuban panetelas in a carton of 10 packs.',
            attributes: {
                vitola: 'Panetela',
                origin: 'Cuba',
                wrapperColor: 'Natural',
                packSize: 'Carton x 10',
            },
        },
    ],
    tobacco: [
        {
            name: 'Virginia Pipe Tobacco 50g',
            sku: 'TOB-PIP-VIR-50',
            price: 18,
            stockQty: 80,
            description: 'Smooth Virginia leaf blend for pipe smokers, 50g tin.',
            attributes: { type: 'Pipe Tobacco', leafOrigin: 'Virginia', weight: '50g' },
            isFeatured: true,
        },
        {
            name: 'Latakia Blend Loose Leaf 100g',
            sku: 'TOB-LOO-LAT-100',
            price: 32,
            stockQty: 45,
            description: 'A smoky Latakia loose leaf blend, 100g pack.',
            attributes: { type: 'Loose Leaf', leafOrigin: 'Latakia', weight: '100g' },
        },
        {
            name: 'Burley Rolling Tobacco 25g',
            sku: 'TOB-ROL-BUR-25',
            price: 9.5,
            stockQty: 150,
            description: 'A rich burley rolling tobacco, 25g pouch.',
            attributes: { type: 'Rolling Tobacco', leafOrigin: 'Burley', weight: '25g' },
        },
        {
            name: 'Oriental Shisha 250g',
            sku: 'TOB-SHI-ORI-250',
            price: 28,
            stockQty: 60,
            description: 'An aromatic oriental shisha blend, 250g tub.',
            attributes: { type: 'Shisha', leafOrigin: 'Oriental', weight: '250g' },
        },
        {
            name: 'Virginia Rolling Tobacco 100g',
            sku: 'TOB-ROL-VIR-100',
            price: 22,
            stockQty: 70,
            description: 'Bright Virginia rolling tobacco in a 100g pouch.',
            attributes: { type: 'Rolling Tobacco', leafOrigin: 'Virginia', weight: '100g' },
        },
    ],
    accessories: [
        {
            name: 'Gold Plated Cigar Cutter',
            sku: 'ACC-CUT-GLD-01',
            price: 55,
            stockQty: 25,
            description: 'A precision double-guillotine cutter with a gold plated finish.',
            attributes: { accessoryType: 'Cutters & Guillotines', material: 'Gold Plated' },
            isFeatured: true,
        },
        {
            name: 'Walnut Wood Humidor',
            sku: 'ACC-HUM-WAL-01',
            price: 149,
            stockQty: 15,
            description: 'A handcrafted walnut wood humidor with Spanish cedar lining.',
            attributes: { accessoryType: 'Humidors', material: 'Walnut Wood' },
            isFeatured: true,
        },
        {
            name: 'Leather Cigar Case',
            sku: 'ACC-CAS-LTH-01',
            price: 39,
            stockQty: 40,
            description: 'A slim genuine leather travel case for two cigars.',
            attributes: { accessoryType: 'Cigar Cases', material: 'Leather' },
        },
        {
            name: 'Stainless Steel Pocket Lighter',
            sku: 'ACC-LGT-STL-01',
            price: 29,
            stockQty: 50,
            description: 'A refillable stainless steel pocket lighter with a soft flame.',
            attributes: { accessoryType: 'Lighters', material: 'Stainless Steel' },
        },
        {
            name: 'Sterling Silver Gift Set',
            sku: 'ACC-GFT-SLV-01',
            price: 189,
            stockQty: 12,
            description: 'A matching cutter and ashtray gift set in sterling silver.',
            attributes: { accessoryType: 'Gift Sets', material: 'Sterling Silver' },
        },
    ],
};

const FALLBACK_BRAND_TITLE_BY_CATEGORY: Record<ProductCategorySlug, string> = {
    cigarettes: 'Marlboro',
    cigars: 'Montecristo',
    tobacco: 'Davidoff',
    accessories: 'Dunhill',
};

const generateUniqueSlug = async (name: string) => {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let suffix = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await ProductModel.findOne({ slug }).lean()) {
        slug = `${baseSlug}-${suffix++}`;
    }
    return slug;
};

export const seedProducts = async (): Promise<void> => {
    await connectDatabase();

    try {
        let createdCount = 0;
        let skippedCategories = 0;

        for (const categorySlug of Object.keys(PRODUCTS_BY_CATEGORY) as ProductCategorySlug[]) {
            const category = await CategoryModel.findOne({
                name: { $regex: `^${categorySlug}$`, $options: 'i' },
            }).lean();

            if (!category) {
                logger.warn(
                    `⚠️  Category "${categorySlug}" not found in DB — skipping its products.`,
                );
                skippedCategories += 1;
                continue;
            }

            const preferredTitle = FALLBACK_BRAND_TITLE_BY_CATEGORY[categorySlug];
            const brand =
                (await BrandModel.findOne({
                    category: category._id,
                    title: { $regex: `^${preferredTitle}$`, $options: 'i' },
                }).lean()) || (await BrandModel.findOne({ category: category._id }).lean());

            if (!brand) {
                logger.warn(`No brand found for category "${category.name}" — skipping its products.`);
                skippedCategories += 1;
                continue;
            }

            const fields = getAttributeFields(category.name) || [];
            for (const product of PRODUCTS_BY_CATEGORY[categorySlug] ?? []) {
                for (const field of fields) {
                    const value = product.attributes[field.key];
                    if (!value || !field.options.includes(value)) {
                        throw new Error(
                            `Seed "${product.sku}" has invalid ${field.key}: ${value || '(empty)'}`,
                        );
                    }
                }

                const image = PLACEHOLDER_IMAGE(product.name);
                const existing = await ProductModel.findOne({ sku: product.sku });

                if (existing) {
                    existing.set({
                        name: product.name,
                        price: product.price,
                        stockQty: product.stockQty,
                        description: product.description,
                        attributes: product.attributes,
                        isActive: true,
                        isFeatured: Boolean(product.isFeatured),
                        image: existing.image || image,
                        images: existing.images?.length ? existing.images : [image],
                    });
                    await existing.save();
                    continue;
                }

                const slug = await generateUniqueSlug(product.name);

                await ProductModel.create({
                    name: product.name,
                    slug,
                    sku: product.sku,
                    category: category._id,
                    brand: brand._id,
                    price: product.price,
                    stockQty: product.stockQty,
                    description: product.description,
                    image,
                    images: [image],
                    attributes: product.attributes,
                    isActive: true,
                    isFeatured: Boolean(product.isFeatured),
                });

                createdCount += 1;
            }
        }

        logger.info('✅ Products seeded successfully', {
            created: createdCount,
            skippedCategories,
        });
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    void seedProducts()
        .then(() => {
            logger.info('🎉 Product seed completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Product seed failed.', {
                error: error instanceof Error ? error.message : String(error),
            });
            process.exit(1);
        });
}
