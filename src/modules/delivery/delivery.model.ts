import { Schema, model } from 'mongoose';
import type { IDeliveryDocument } from './delivery.interface';

const deliveryOptionSchema = new Schema(
    {
        day: { type: String, required: true, default: '3-5 Business Days' },
        price: { type: Number, required: true, default: 4.99, min: 0 },
    },
    { _id: false },
);

const deliverySchema = new Schema<IDeliveryDocument>(
    {
        maximumPrice: { type: Number, required: true, default: 200, min: 0 },
        standardDelivery: {
            type: deliveryOptionSchema,
            required: true,
            default: () => ({ day: '3-5 Business Days', price: 4.99 }),
        },
        expressDelivery: {
            type: deliveryOptionSchema,
            required: true,
            default: () => ({ day: '1-2 Business Days', price: 9.99 }),
        },
    },
    { timestamps: true },
);

export const DeliveryModel = model<IDeliveryDocument>('Delivery', deliverySchema);
