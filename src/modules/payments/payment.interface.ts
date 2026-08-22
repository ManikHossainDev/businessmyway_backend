export const PaymentType = {
    PRODUCT_PURCHASE: 'product_purchase',
} as const;

export type PaymentTypeValue = (typeof PaymentType)[keyof typeof PaymentType];
