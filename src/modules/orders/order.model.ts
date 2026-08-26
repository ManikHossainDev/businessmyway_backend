import mongoose, { Schema } from 'mongoose';
import type { IOrderDocument } from './order.interface';
import { DELIVERY_TYPES, ORDER_STATUS } from './order.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';

const orderItemSchema = new Schema(
    {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true, trim: true },
        image: { type: String, trim: true, default: '' },
        price: { type: Number, required: true, min: 0 },
        qty: { type: Number, required: true, min: 1 },
    },
    { _id: false },
);

const orderSchema = new Schema<IOrderDocument>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        items: {
            type: [orderItemSchema],
            required: true,
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        deliveryFee: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        total: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: Object.values(ORDER_STATUS),
            default: ORDER_STATUS.PENDING,
            index: true,
        },
        deliveryType: {
            type: String,
            enum: Object.values(DELIVERY_TYPES),
            default: DELIVERY_TYPES.IN_DELIVERY,
        },
        customer: {
            name: { type: String, required: true, trim: true },
            phone: { type: String, required: true, trim: true },
            email: { type: String, required: true, trim: true, lowercase: true },
            location: { type: String, required: true, trim: true },
        },
        stripeSessionId: { type: String, trim: true, index: true },
        stripePaymentIntentId: { type: String, trim: true },
        paidAt: { type: Date },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
        collection: 'orders',
    },
);

orderSchema.plugin(toJSONPlugin);

export const OrderModel = mongoose.model<IOrderDocument>('Order', orderSchema);
