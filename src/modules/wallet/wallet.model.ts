import mongoose, { Schema } from 'mongoose';
import type { IWalletDocument } from './wallet.interface';
import { toJSONPlugin } from '@infra/database/plugins/toJSON.plugin';
import { paginatePlugin, type PaginateModel } from '@infra/database/plugins/paginate.plugin';

const walletSchema = new Schema<IWalletDocument>(
    {
        USERId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        availableBalance: {
            type: Number,
            default: 0,
            min: 0,
        },
        pendingBalance: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalEarned: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalWithdrawn: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalBonusEarned: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalCommissionEarned: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        versionKey: false,
    },
);

walletSchema.plugin(toJSONPlugin);
walletSchema.plugin(paginatePlugin);

walletSchema.index({ USERId: 1 }, { unique: true });

export const WalletModel = mongoose.model<IWalletDocument, PaginateModel<IWalletDocument>>(
    'Wallet',
    walletSchema,
    'wallets',
);
