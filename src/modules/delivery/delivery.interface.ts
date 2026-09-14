import type { Document } from 'mongoose';

export interface IDeliveryOption {
    day: string;
    price: number;
}

export interface IDelivery {
    maximumPrice: number;
    standardDelivery: IDeliveryOption;
    expressDelivery: IDeliveryOption;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IDeliveryDocument extends IDelivery, Document {}
