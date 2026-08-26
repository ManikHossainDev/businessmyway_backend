import type { Document, Types } from 'mongoose';

export const ORDER_STATUS = {
    PENDING: 'pending',
    PAID: 'paid',
    CANCELLED: 'cancelled',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const DELIVERY_TYPES = {
    IN_DELIVERY: 'in_delivery',
    PAID_DELIVERY: 'paid_delivery',
} as const;

export type DeliveryType = (typeof DELIVERY_TYPES)[keyof typeof DELIVERY_TYPES];

export const IN_DELIVERY_FEE = 10;
export const PAID_DELIVERY_FEE = 4.99;

export interface IOrderItem {
    product: Types.ObjectId;
    name: string;
    image: string;
    price: number;
    qty: number;
}

export interface IOrderCustomer {
    name: string;
    phone: string;
    email: string;
    location: string;
}

export interface IOrder {
    user: Types.ObjectId;
    orderNumber: string;
    items: IOrderItem[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    status: OrderStatus;
    deliveryType: DeliveryType;
    customer: IOrderCustomer;
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
    paidAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IOrderDocument extends IOrder, Document {
    id: string;
}
