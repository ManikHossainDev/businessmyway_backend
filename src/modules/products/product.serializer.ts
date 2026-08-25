import type { IProductPopulated } from './product.interface';

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

const buildSubtitle = (attributes: Record<string, string> = {}) => {
    if (attributes.packSize) {
        return attributes.packSize.replace('Pack', 'piece/pack');
    }
    return attributes.weight || attributes.accessoryType || attributes.vitola || '';
};

export const serializeProduct = (product: IProductPopulated | null) => {
    if (!product) return null;

    const category =
        product.category && typeof product.category === 'object' && 'name' in product.category
            ? {
                  id: getId(product.category),
                  name: product.category.name,
              }
            : {
                  id: getId(product.category),
                  name: '',
              };

    const brand =
        product.brand && typeof product.brand === 'object' && 'title' in product.brand
            ? {
                  id: getId(product.brand),
                  title: product.brand.title,
              }
            : {
                  id: getId(product.brand),
                  title: '',
              };

    const attributes = product.attributes || {};
    const images = product.images?.length ? product.images : product.image ? [product.image] : [];

    return {
        id: getId(product),
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        price: product.price,
        stockQty: product.stockQty,
        description: product.description || '',
        image: images[0] || product.image || '',
        images,
        attributes,
        subtitle: buildSubtitle(attributes),
        packSize: attributes.packSize || '',
        isActive: product.isActive,
        isFeatured: Boolean(product.isFeatured),
        category,
        brand,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
    };
};
