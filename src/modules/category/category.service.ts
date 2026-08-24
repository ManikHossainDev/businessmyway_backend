import { CategoryModel } from './category.model';
import type { ICategoryDocument } from './category.interface';
import { ConflictError, NotFoundError } from '@/core/errors';
import { MESSAGES } from '@/core/constants/messages';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
}

export const categoryService = new CategoryService();
