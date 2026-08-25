import { WishlistModel } from './wishlist.model';
import { ProductModel } from '@/modules/products/product.model';
import type { IProductPopulated } from '@/modules/products/product.interface';
import type { IWishlistPopulated } from './wishlist.interface';
import { NotFoundError } from '@/core/errors';
import { MESSAGES } from '@/core/constants/messages';

const productPopulate = [
    { path: 'category', select: 'name' },
    { path: 'brand', select: 'title' },
];

export class WishlistService {
    async list(userId: string): Promise<IProductPopulated[]> {
        const items = await WishlistModel.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate({
                path: 'product',
                populate: productPopulate,
            })
            .lean<IWishlistPopulated[]>();

        return items
            .map((item) => item.product)
            .filter((product): product is IProductPopulated => {
                if (!product || typeof product !== 'object' || !('name' in product)) {
                    return false;
                }
                return product.isActive !== false;
            });
    }

    async listIds(userId: string): Promise<string[]> {
        const items = await WishlistModel.find({ user: userId }).select('product').lean();
        return items.map((item) => String(item.product));
    }

    async add(userId: string, productId: string): Promise<IProductPopulated> {
        const product = await ProductModel.findById(productId)
            .populate(productPopulate)
            .lean<IProductPopulated>();
        if (!product || product.isActive === false) {
            throw new NotFoundError(MESSAGES.PRODUCT.NOT_FOUND, 'PRODUCT_NOT_FOUND');
        }

        try {
            await WishlistModel.create({ user: userId, product: productId });
        } catch (error) {
            if ((error as { code?: number }).code !== 11000) {
                throw error;
            }
        }

        return product;
    }

    async remove(userId: string, productId: string): Promise<void> {
        const deleted = await WishlistModel.findOneAndDelete({
            user: userId,
            product: productId,
        });
        if (!deleted) {
            throw new NotFoundError(MESSAGES.WISHLIST.NOT_FOUND, 'WISHLIST_NOT_FOUND');
        }
    }
}

export const wishlistService = new WishlistService();
