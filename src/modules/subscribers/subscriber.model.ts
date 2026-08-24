import mongoose, { Schema } from 'mongoose';
import type { ISubscriberDocument } from './subscriber.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';

const subscriberSchema = new Schema<ISubscriberDocument>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            trim: true,
            lowercase: true,
            maxlength: 120,
        },
        agreed: {
            type: Boolean,
            required: [true, 'Agreement is required'],
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
        collection: 'subscribers',
    },
);

subscriberSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
subscriberSchema.plugin(toJSONPlugin);

export const SubscriberModel = mongoose.model<ISubscriberDocument>('Subscriber', subscriberSchema);
