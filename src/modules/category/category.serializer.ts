import type { ICategory } from './category.interface';

export const serializeCategory = (category: (ICategory & { id?: string; _id?: unknown }) | null) => {
    if (!category) return null;

    return {
        id: category.id || String(category._id || ''),
        name: category.name,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
    };
};
