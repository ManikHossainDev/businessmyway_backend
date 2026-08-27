import { CategoryModel } from './category.model';
import { ProductModel } from '@/modules/products/product.model';
import { BrandModel } from '@/modules/brands/brand.model';
import type { ICategoryDocument } from './category.interface';
import { BadRequestError, ConflictError, NotFoundError } from '@/core/errors';
import { MESSAGES } from '@/core/constants/messages';
import { isLockedCategoryName } from './category.constants';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const assertUnlocked = (name: string) => {
    if (isLockedCategoryName(name)) {
        throw new BadRequestError(MESSAGES.CATEGORY.LOCKED, 'CATEGORY_LOCKED');
    }
};

export class CategoryService {
    async list(): Promise<ICategoryDocument[]> {
        return CategoryModel.find().sort({ createdAt: -1 }).lean<ICategoryDocument[]>();
    }

    async getById(id: string): Promise<ICategoryDocument> {
        const category = await CategoryModel.findById(id).lean<ICategoryDocument>();
        if (!category) {
            throw new NotFoundError(MESSAGES.CATEGORY.NOT_FOUND, 'CATEGORY_NOT_FOUND');
        }
        return category;
    }

    async create(name: string): Promise<ICategoryDocument> {
        if (isLockedCategoryName(name)) {
            throw new BadRequestError(MESSAGES.CATEGORY.LOCKED, 'CATEGORY_LOCKED');
        }

        const exists = await CategoryModel.findOne({
            name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
        }).lean();

        if (exists) {
            throw new ConflictError(MESSAGES.CATEGORY.ALREADY_EXISTS, 'CATEGORY_EXISTS');
        }

        return CategoryModel.create({ name });
    }

    async update(id: string, name: string): Promise<ICategoryDocument> {
        const category = await CategoryModel.findById(id);
        if (!category) {
            throw new NotFoundError(MESSAGES.CATEGORY.NOT_FOUND, 'CATEGORY_NOT_FOUND');
        }

        assertUnlocked(category.name);
        if (isLockedCategoryName(name)) {
            throw new BadRequestError(MESSAGES.CATEGORY.LOCKED, 'CATEGORY_LOCKED');
        }

        const exists = await CategoryModel.findOne({
            _id: { $ne: id },
            name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
        }).lean();

        if (exists) {
            throw new ConflictError(MESSAGES.CATEGORY.ALREADY_EXISTS, 'CATEGORY_EXISTS');
        }

        category.name = name;
        await category.save();
        return category;
    }

    async remove(id: string): Promise<void> {
        const category = await CategoryModel.findById(id);
        if (!category) {
            throw new NotFoundError(MESSAGES.CATEGORY.NOT_FOUND, 'CATEGORY_NOT_FOUND');
        }

        assertUnlocked(category.name);

        const [productCount, brandCount] = await Promise.all([
            ProductModel.countDocuments({ category: id }),
            BrandModel.countDocuments({ category: id }),
        ]);

        if (productCount > 0 || brandCount > 0) {
            throw new BadRequestError(
                'Remove products and brands from this category before deleting it.',
                'CATEGORY_IN_USE',
            );
        }

        await category.deleteOne();
    }
}

export const categoryService = new CategoryService();
