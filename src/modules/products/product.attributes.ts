export const EXCLUDED_PRODUCT_CATEGORY = 'Brands';

export type ProductCategorySlug = 'cigarettes' | 'cigars' | 'tobacco' | 'accessories';

export type ProductAttributeField = {
    key: string;
    label: string;
    options: string[];
};

export const PRODUCT_ATTRIBUTE_SCHEMA: Record<ProductCategorySlug, ProductAttributeField[]> = {
    cigarettes: [
        {
            key: 'strength',
            label: 'Strength',
            options: ['Ultra Light', 'Light', 'Medium', 'Full Strength'],
        },
        {
            key: 'flavour',
            label: 'Flavour',
            options: ['Classic', 'Menthol', 'Vanilla'],
        },
        {
            key: 'packSize',
            label: 'Pack Size',
            options: ['10 Pack', '20 Pack', 'Carton x 10'],
        },
    ],
    cigars: [
        {
            key: 'vitola',
            label: 'Size / Vitola',
            options: ['Robusto', 'Churchill', 'Toro', 'Corona', 'Panetela'],
        },
        {
            key: 'origin',
            label: 'Origin',
            options: ['Cuba', 'Nicaragua', 'Dominican Republic', 'Honduras'],
        },
        {
            key: 'wrapperColor',
            label: 'Wrapper Colour',
            options: ['Natural', 'Claro', 'Colorado', 'Maduro'],
        },
        {
            key: 'packSize',
            label: 'Pack Size',
            options: ['10 Pack', '20 Pack', 'Carton x 10'],
        },
    ],
    tobacco: [
        {
            key: 'type',
            label: 'Type',
            options: ['Pipe Tobacco', 'Rolling Tobacco', 'Loose Leaf', 'Shisha'],
        },
        {
            key: 'leafOrigin',
            label: 'Leaf Origin',
            options: ['Virginia', 'Burley', 'Oriental', 'Latakia'],
        },
        {
            key: 'weight',
            label: 'Weight',
            options: ['25g', '50g', '100g', '250g'],
        },
    ],
    accessories: [
        {
            key: 'accessoryType',
            label: 'Category',
            options: [
                'Lighters',
                'Cutters & Guillotines',
                'Cigar Cases',
                'Humidors',
                'Ashtrays',
                'Pipes',
                'Gift Sets',
            ],
        },
        {
            key: 'material',
            label: 'Material',
            options: ['Gold Plated', 'Sterling Silver', 'Leather', 'Walnut Wood', 'Stainless Steel'],
        },
    ],
};

export const PRODUCT_ATTRIBUTE_KEYS = [
    ...new Set(Object.values(PRODUCT_ATTRIBUTE_SCHEMA).flatMap((fields) => fields.map((field) => field.key))),
];

export const toCategorySlug = (name: string) => name.trim().toLowerCase();

export const getAttributeFields = (categoryName: string): ProductAttributeField[] | null => {
    const slug = toCategorySlug(categoryName) as ProductCategorySlug;
    return PRODUCT_ATTRIBUTE_SCHEMA[slug] ?? null;
};

/** Strength/flavour/etc. sidebar filters — only Cigarettes, Cigars, Tobacco, Accessories. */
export const hasFilterSidebar = (categoryName: string) =>
    Boolean(getAttributeFields(categoryName)?.length);

/** Any category except Brands can hold products. */
export const isProductCategory = (categoryName: string) =>
    toCategorySlug(categoryName) !== toCategorySlug(EXCLUDED_PRODUCT_CATEGORY);
