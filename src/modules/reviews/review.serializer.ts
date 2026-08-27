import { Types } from 'mongoose';

type SavedAddress = {
    area?: string;
    location?: string;
    postcode?: string;
    isDefault?: boolean;
};

type ReviewInput = {
    id?: string;
    _id?: unknown;
    name: string;
    text: string;
    rating: number;
    tag?: string;
    createdAt?: Date;
    updatedAt?: Date;
    product?: unknown;
    user?: unknown;
};

type PopulatedUser = {
    _id?: unknown;
    id?: string;
    name?: string;
    avatar?: string;
    savedAddresses?: SavedAddress[];
};

const getRefId = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value instanceof Types.ObjectId) return value.toString();
    if (typeof value === 'object') {
        const obj = value as { _id?: unknown; id?: unknown };
        if (obj._id instanceof Types.ObjectId) return obj._id.toString();
        if (obj._id) return String(obj._id);
        if (typeof obj.id === 'string') return obj.id;
    }
    return null;
};

const getPopulatedName = (value: unknown): string | null => {
    if (value && typeof value === 'object' && 'name' in value) {
        const name = (value as { name?: unknown }).name;
        return typeof name === 'string' ? name : null;
    }
    return null;
};

const formatUserLocation = (addresses?: SavedAddress[]) => {
    if (!addresses?.length) return null;
    const selected = addresses.find((item) => item.isDefault) ?? addresses[0];
    if (!selected) return null;
    const parts = [selected.area, selected.postcode].filter(Boolean);
    return parts.length ? parts.join(', ') : selected.location || null;
};

export const serializeReview = (review: ReviewInput | null) => {
    if (!review) return null;

    const product = review.product;
    const user = review.user;
    const populatedUser =
        user && typeof user === 'object' && !(user instanceof Types.ObjectId)
            ? (user as PopulatedUser)
            : null;

    return {
        id: review.id || String(review._id || ''),
        name: review.name,
        text: review.text,
        rating: review.rating,
        tag: review.tag || 'Verified Buyer',
        productId: getRefId(product),
        productName: getPopulatedName(product),
        userId: getRefId(user),
        userName: populatedUser?.name || review.name,
        userAvatar: populatedUser?.avatar || null,
        userLocation: populatedUser ? formatUserLocation(populatedUser.savedAddresses) : null,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
    };
};
