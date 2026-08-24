import type { Types } from 'mongoose';
import { BrandModel } from './brand.model';
import { CategoryModel } from '@/modules/category/category.model';
import type { IBrandPopulated } from './brand.interface';
import { NotFoundError } from '@/core/errors';
import { MESSAGES } from '@/core/constants/messages';

const populateCategory = { path: 'category', select: 'name' };

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const cleanSubtitles = (subtitles: string[]) =>
    subtitles.map((item) => item.trim()).filter(Boolean);

export class BrandService {
    async list(categoryName?: string): Promise<IBrandPopulated[]> {
        const filter: { category?: Types.ObjectId } = {};

        if (categoryName) {
            const category = await CategoryModel.findOne({
                name: { $regex: `^${escapeRegex(categoryName)}$`, $options: 'i' },
            }).lean();

            if (!category) {
                return [];
            }

            filter.category = category._id;
        }

        return BrandModel.find(filter)
            .populate(populateCategory)
            .sort({ createdAt: -1 })
            .lean<IBrandPopulated[]>();
    }

    async getById(id: string): Promise<IBrandPopulated> {
        const brand = await BrandModel.findById(id).populate(populateCategory).lean<IBrandPopulated>();
        if (!brand) {
            throw new NotFoundError(MESSAGES.BRAND.NOT_FOUND, 'BRAND_NOT_FOUND');
        }
        return brand;
    }

    async create(payload: {
        category: string;
        title: string;
        description: string;
        subtitles: string[];
    }): Promise<IBrandPopulated> {
        const category = await CategoryModel.findById(payload.category).lean();
        if (!category) {
            throw new NotFoundError(MESSAGES.CATEGORY.NOT_FOUND, 'CATEGORY_NOT_FOUND');
        }

        const created = await BrandModel.create({
            category: payload.category,
            title: payload.title,
            description: payload.description,
            subtitles: cleanSubtitles(payload.subtitles),
        });

        return this.getById(created.id);
    }

    async update(
        id: string,
        payload: {
            category: string;
            title: string;
            description: string;
            subtitles: string[];
        },
    ): Promise<IBrandPopulated> {
        const brand = await BrandModel.findById(id);
        if (!brand) {
            throw new NotFoundError(MESSAGES.BRAND.NOT_FOUND, 'BRAND_NOT_FOUND');
        }

        const category = await CategoryModel.findById(payload.category).lean();
        if (!category) {
            throw new NotFoundError(MESSAGES.CATEGORY.NOT_FOUND, 'CATEGORY_NOT_FOUND');
        }

        brand.set('category', payload.category);
        brand.title = payload.title;
        brand.description = payload.description;
        brand.subtitles = cleanSubtitles(payload.subtitles);
        await brand.save();

        return this.getById(id);
    }
}

export const brandService = new BrandService();
