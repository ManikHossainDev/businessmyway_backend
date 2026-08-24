import type { IBrandPopulated } from './brand.interface';

const getId = (value: unknown) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
        const obj = value as { id?: unknown; _id?: unknown };
        if (typeof obj.id === 'string' && obj.id.length === 24) return obj.id;
        if (obj._id) return String(obj._id);
        return String(value);
    }
    return String(value);
};

export const serializeBrand = (brand: IBrandPopulated | null) => {
    if (!brand) return null;

    const category =
        brand.category && typeof brand.category === 'object' && 'name' in brand.category
            ? {
                  id: getId(brand.category),
                  name: brand.category.name,
              }
            : {
                  id: getId(brand.category),
                  name: '',
              };

    return {
        id: getId(brand),
        title: brand.title,
        description: brand.description,
        subtitles: brand.subtitles || [],
        category,
        createdAt: brand.createdAt,
        updatedAt: brand.updatedAt,
    };
};
