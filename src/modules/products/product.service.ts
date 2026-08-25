import type { Types } from 'mongoose';
import { ProductModel } from './product.model';
import { CategoryModel } from '@/modules/category/category.model';
import { BrandModel } from '@/modules/brands/brand.model';
import type { IProductDocument, IProductPopulated, ProductFacets } from './product.interface';
import { BadRequestError, ConflictError, NotFoundError } from '@/core/errors';
import { MESSAGES } from '@/core/constants/messages';
import type { OffsetPaginationParams, OffsetPaginationResult } from '@/core/types/pagination.types';
import { getAttributeFields, isProductCategory } from './product.attributes';
import type { CreateProductBody, UpdateProductBody } from './product.validation';

const populateRefs = [
    { path: 'category', select: 'name' },
    { path: 'brand', select: 'title' },
];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const emptyResult = (
    page: number,
    limit: number,
): OffsetPaginationResult<IProductPopulated> & { facets: ProductFacets; totalInCategory: number } => ({
    data: [],
    meta: {
        page,
        limit,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
    },
    facets: {},
    totalInCategory: 0,
});

const toFiniteNumber = (value: unknown): number | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const parseList = (value: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
    return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
};

const sanitizeAttributes = (categoryName: string, attributes: Record<string, string> = {}) => {
    const fields = getAttributeFields(categoryName) || [];
    if (!fields.length) {
        return {};
    }

    const cleaned: Record<string, string> = {};
    for (const field of fields) {
        const value = String(attributes[field.key] || '').trim();
        if (!value) {
            throw new BadRequestError(`${field.label} is required.`, 'PRODUCT_ATTRIBUTE_REQUIRED');
        }
        if (!field.options.includes(value)) {
            throw new BadRequestError(`${field.label} is invalid.`, 'PRODUCT_ATTRIBUTE_INVALID');
        }
        cleaned[field.key] = value;
    }
    return cleaned;
};

const slugify = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

const uniqueSlug = async (name: string, excludeId?: string) => {
    const base = slugify(name) || 'product';
    let slug = base;
    let suffix = 1;
    while (
        await ProductModel.exists({
            slug,
            ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        })
    ) {
        slug = `${base}-${suffix++}`;
    }
    return slug;
};

const resolveImages = (payload: CreateProductBody) => {
    const image = payload.image?.trim() || '';
    return {
        image,
        images: image ? [image] : [],
    };
};

const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    bestSelling: { createdAt: -1 },
    priceAsc: { price: 1 },
    priceDesc: { price: -1 },
};

export type ProductListQuery = {
    category?: string;
    brand?: string[];
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
    [key: string]: unknown;
};

export class ProductService {
    async getById(id: string): Promise<IProductPopulated> {
        const product = await ProductModel.findById(id)
            .populate(populateRefs)
            .lean<IProductPopulated>();
        if (!product) {
            throw new NotFoundError(MESSAGES.PRODUCT.NOT_FOUND, 'PRODUCT_NOT_FOUND');
        }
        return product;
    }

    async list(
        query: ProductListQuery,
        pagination?: OffsetPaginationParams,
        options?: { activeOnly?: boolean },
    ) {
        const page = Math.max(1, pagination?.page ?? 1);
        const limit = Math.max(1, Math.min(100, pagination?.limit ?? 8));
        const filter: Record<string, unknown> = {};

        if (options?.activeOnly) {
            filter.isActive = true;
        } else if (query.active === true) {
            filter.isActive = true;
        } else if (query.active === false) {
            filter.isActive = false;
        }

        let categoryId: Types.ObjectId | undefined;
        let categoryName = '';

        if (query.category) {
            const category = await CategoryModel.findOne({
                name: { $regex: `^${escapeRegex(query.category)}$`, $options: 'i' },
            }).lean();

            if (!category) {
                return emptyResult(page, limit);
            }

            categoryId = category._id;
            categoryName = category.name;
            filter.category = categoryId;
        }

        const brandTitles = parseList(query.brand);
        if (brandTitles.length) {
            const brands = await BrandModel.find({
                ...(categoryId ? { category: categoryId } : {}),
                title: { $in: brandTitles.map((title) => new RegExp(`^${escapeRegex(title)}$`, 'i')) },
            }).lean();

            if (!brands.length) {
                const empty = emptyResult(page, limit);
                if (categoryId) {
                    const facets = await this.buildFacets(categoryId, categoryName, options?.activeOnly);
                    return { ...empty, facets, totalInCategory: facets._total ?? 0 };
                }
                return empty;
            }

            filter.brand = { $in: brands.map((brand) => brand._id) };
        }

        const attributeFields = categoryName ? getAttributeFields(categoryName) || [] : [];
        for (const field of attributeFields) {
            const selected = parseList(query[field.key]);
            if (selected.length) {
                filter[`attributes.${field.key}`] = { $in: selected };
            }
        }

        const minPrice = toFiniteNumber(query.minPrice);
        const maxPrice = toFiniteNumber(query.maxPrice);
        if (minPrice !== undefined) {
            filter.price = { ...(filter.price as object), $gte: minPrice };
        }
        if (maxPrice !== undefined) {
            filter.price = { ...(filter.price as object), $lte: maxPrice };
        }

        if (query.featured === true) {
            filter.isFeatured = true;
        }
        if (query.featured === false) {
            filter.isFeatured = false;
        }

        const search =
            typeof query.search === 'string' ? query.search.trim() : '';
        if (search) {
            filter.name = { $regex: escapeRegex(search), $options: 'i' };
        }

        const sort = sortMap[query.sort || 'newest'] || sortMap.newest;

            const [total, data, facets] = await Promise.all([
            ProductModel.countDocuments(filter),
            ProductModel.find(filter)
                .populate(populateRefs)
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit)
                .lean<IProductPopulated[]>(),
            categoryId
                ? this.buildFacets(categoryId, categoryName, options?.activeOnly)
                : Promise.resolve({} as ProductFacets & { _total?: number }),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages && total > 0,
                hasPrevPage: page > 1,
            },
            facets,
            totalInCategory: facets._total ?? total,
        };
    }

    private async buildFacets(
        categoryId: Types.ObjectId,
        categoryName: string,
        activeOnly?: boolean,
    ): Promise<ProductFacets & { _total?: number }> {
        const match: Record<string, unknown> = { category: categoryId };
        if (activeOnly) match.isActive = true;

        const [products, brands] = await Promise.all([
            ProductModel.find(match).select('brand attributes').lean(),
            BrandModel.find({ category: categoryId }).select('title').lean(),
        ]);

        const brandCounts = new Map<string, number>();
        for (const product of products) {
            const key = String(product.brand);
            brandCounts.set(key, (brandCounts.get(key) || 0) + 1);
        }

        const facets: ProductFacets = {
            brand: brands.map((brand) => ({
                label: brand.title,
                count: brandCounts.get(String(brand._id)) || 0,
            })),
        };

        const fields = getAttributeFields(categoryName) || [];
        for (const field of fields) {
            const counts: Record<string, number> = Object.fromEntries(
                field.options.map((option) => [option, 0]),
            );
            for (const product of products) {
                const value = product.attributes?.[field.key];
                if (value && counts[value] !== undefined) {
                    counts[value] += 1;
                }
            }
            facets[field.key] = field.options.map((label) => ({
                label,
                count: counts[label] ?? 0,
            }));
        }

        return Object.assign(facets, { _total: products.length });
    }

    async create(payload: CreateProductBody): Promise<IProductPopulated> {
        const category = await CategoryModel.findById(payload.category).lean();
        if (!category) {
            throw new NotFoundError(MESSAGES.CATEGORY.NOT_FOUND, 'CATEGORY_NOT_FOUND');
        }
        if (!isProductCategory(category.name)) {
            throw new BadRequestError(MESSAGES.PRODUCT.INVALID_CATEGORY, 'PRODUCT_INVALID_CATEGORY');
        }

        const brand = await BrandModel.findById(payload.brand).lean();
        if (!brand) {
            throw new NotFoundError(MESSAGES.BRAND.NOT_FOUND, 'BRAND_NOT_FOUND');
        }
        if (String(brand.category) !== String(category._id)) {
            throw new BadRequestError(MESSAGES.PRODUCT.INVALID_BRAND, 'PRODUCT_INVALID_BRAND');
        }

        const skuTaken = await ProductModel.exists({
            sku: { $regex: `^${escapeRegex(payload.sku)}$`, $options: 'i' },
        });
        if (skuTaken) {
            throw new ConflictError(MESSAGES.PRODUCT.SKU_EXISTS, 'PRODUCT_SKU_EXISTS');
        }

        const media = resolveImages(payload);
        const created = await ProductModel.create({
            name: payload.name,
            slug: await uniqueSlug(payload.name),
            sku: payload.sku,
            category: payload.category,
            brand: payload.brand,
            price: payload.price,
            stockQty: payload.stockQty,
            description: payload.description || '',
            image: media.image,
            images: media.images,
            isActive: payload.isActive ?? true,
            isFeatured: payload.isFeatured ?? false,
            attributes: sanitizeAttributes(category.name, payload.attributes),
        });

        return this.getById(created.id);
    }

    async update(id: string, payload: UpdateProductBody): Promise<IProductPopulated> {
        const product = await ProductModel.findById(id);
        if (!product) {
            throw new NotFoundError(MESSAGES.PRODUCT.NOT_FOUND, 'PRODUCT_NOT_FOUND');
        }

        const category = await CategoryModel.findById(payload.category).lean();
        if (!category) {
            throw new NotFoundError(MESSAGES.CATEGORY.NOT_FOUND, 'CATEGORY_NOT_FOUND');
        }
        if (!isProductCategory(category.name)) {
            throw new BadRequestError(MESSAGES.PRODUCT.INVALID_CATEGORY, 'PRODUCT_INVALID_CATEGORY');
        }

        const brand = await BrandModel.findById(payload.brand).lean();
        if (!brand) {
            throw new NotFoundError(MESSAGES.BRAND.NOT_FOUND, 'BRAND_NOT_FOUND');
        }
        if (String(brand.category) !== String(category._id)) {
            throw new BadRequestError(MESSAGES.PRODUCT.INVALID_BRAND, 'PRODUCT_INVALID_BRAND');
        }

        const skuTaken = await ProductModel.exists({
            _id: { $ne: id },
            sku: { $regex: `^${escapeRegex(payload.sku)}$`, $options: 'i' },
        });
        if (skuTaken) {
            throw new ConflictError(MESSAGES.PRODUCT.SKU_EXISTS, 'PRODUCT_SKU_EXISTS');
        }

        const nextImage = payload.image?.trim();
        const media = nextImage
            ? resolveImages({ ...payload, image: nextImage })
            : { image: product.image, images: product.images };
        product.set({
            name: payload.name,
            slug: await uniqueSlug(payload.name, id),
            sku: payload.sku,
            category: payload.category,
            brand: payload.brand,
            price: payload.price,
            stockQty: payload.stockQty,
            description: payload.description || '',
            image: media.image,
            images: media.images,
            isActive: payload.isActive ?? product.isActive,
            isFeatured: payload.isFeatured ?? product.isFeatured,
            attributes: sanitizeAttributes(category.name, payload.attributes),
        });
        await product.save();

        return this.getById(id);
    }

    async delete(id: string): Promise<void> {
        const product = await ProductModel.findById(id);
        if (!product) {
            throw new NotFoundError(MESSAGES.PRODUCT.NOT_FOUND, 'PRODUCT_NOT_FOUND');
        }
        await product.deleteOne();
    }
}

export const productService = new ProductService();
