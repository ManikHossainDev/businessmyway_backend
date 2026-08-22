import type { Document, Types } from 'mongoose';

export interface IWallet {
    USERId: Types.ObjectId;
    availableBalance: number;
    pendingBalance: number;
    totalEarned: number;
    totalWithdrawn: number;
    totalBonusEarned: number;
    totalCommissionEarned: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IWalletDocument extends IWallet, Document {
    id: string;
}

export interface CreateWalletInput {
    USERId: Types.ObjectId;
}

export interface UpdateWalletInput {
    availableBalance?: number;
    pendingBalance?: number;
    totalEarned?: number;
    totalWithdrawn?: number;
    totalBonusEarned?: number;
    totalCommissionEarned?: number;
}
