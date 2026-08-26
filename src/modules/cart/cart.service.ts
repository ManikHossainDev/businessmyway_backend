import { CartModel } from './cart.model';
import { ProductModel } from '@/modules/products/product.model';
import type { IProductPopulated } from '@/modules/products/product.interface';
import type { ICartPopulated } from './cart.interface';
import { BadRequestError, NotFoundError } from '@/core/errors';
import { MESSAGES } from '@/core/constants/messages';

const productPopulate = [
    { path: 'category', select: 'name' },
    { path: 'brand', select: 'title' },
];

const isPopulatedProduct = (product: ICartPopulated['product']): product is IProductPopulated =>
    Boolean(product && typeof product === 'object' && 'name' in product && product.isActive !== false);

export class CartService {
    async list(userId: string) {
        const items = await CartModel.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate({
                path: 'product',
                populate: productPopulate,
            })
            .lean<ICartPopulated[]>();

        return items.filter((item) => isPopulatedProduct(item.product)) as Array<
            ICartPopulated & { product: IProductPopulated }
        >;
    }

    async add(userId: string, productId: string, qty = 1) {
        const product = await ProductModel.findById(productId).lean();
        if (!product || product.isActive === false) {
            throw new NotFoundError(MESSAGES.PRODUCT.NOT_FOUND, 'PRODUCT_NOT_FOUND');
        }

        const existing = await CartModel.findOne({ user: userId, product: productId });
        const nextQty = (existing?.qty ?? 0) + qty;
        if (nextQty > product.stockQty) {
            throw new BadRequestError(MESSAGES.CART.OUT_OF_STOCK, 'CART_OUT_OF_STOCK');
        }

        if (existing) {
            existing.qty = nextQty;
            await existing.save();
        } else {
            await CartModel.create({ user: userId, product: productId, qty });
        }

        return this.list(userId);
    }

    async updateQty(userId: string, productId: string, qty: number) {
        if (qty < 1) {
            await this.remove(userId, productId);
            return this.list(userId);
        }

        const product = await ProductModel.findById(productId).lean();
        if (!product || product.isActive === false) {
            throw new NotFoundError(MESSAGES.PRODUCT.NOT_FOUND, 'PRODUCT_NOT_FOUND');
        }
        if (qty > product.stockQty) {
            throw new BadRequestError(MESSAGES.CART.OUT_OF_STOCK, 'CART_OUT_OF_STOCK');
        }

        const item = await CartModel.findOneAndUpdate(
            { user: userId, product: productId },
            { qty },
            { new: true },
        );
        if (!item) {
            throw new NotFoundError(MESSAGES.CART.NOT_FOUND, 'CART_NOT_FOUND');
        }

        return this.list(userId);
    }

    async remove(userId: string, productId: string) {
        const deleted = await CartModel.findOneAndDelete({ user: userId, product: productId });
        if (!deleted) {
            throw new NotFoundError(MESSAGES.CART.NOT_FOUND, 'CART_NOT_FOUND');
        }
    }

    async clear(userId: string) {
        await CartModel.deleteMany({ user: userId });
    }
}

export const cartService = new CartService();
