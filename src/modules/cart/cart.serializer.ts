import type { IProductPopulated } from '@/modules/products/product.interface';
import { serializeProduct } from '@/modules/products/product.serializer';

export const serializeCartItem = (item: { qty: number; product: IProductPopulated }) => {
    const product = serializeProduct(item.product);
    if (!product) return null;
    return {
        id: product.id,
        qty: item.qty,
        title: product.name,
        image: product.image,
        price: product.price,
        stockQty: product.stockQty,
        product,
    };
};
