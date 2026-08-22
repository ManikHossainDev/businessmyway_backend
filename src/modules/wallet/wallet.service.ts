import type { Types } from 'mongoose';
import type { RepositoryWriteOptions } from '@/core/interfaces/repository.interface';
import type { IWalletDocument } from './wallet.interface';
import { walletRepository, type WalletRepository } from './wallet.repository';

export class WalletService {
    constructor(private readonly repository: WalletRepository = walletRepository) {}

    async createWallet(
        USERId: Types.ObjectId,
        options?: RepositoryWriteOptions,
    ): Promise<IWalletDocument> {
        const wallet = await this.repository.create(
            {
                USERId,
                availableBalance: 0,
                pendingBalance: 0,
                totalEarned: 0,
                totalWithdrawn: 0,
                totalBonusEarned: 0,
                totalCommissionEarned: 0,
            } as any,
            options,
        );
        return wallet;
    }

    async getByUSERId(USERId: string): Promise<IWalletDocument | null> {
        return this.repository.findByUSERId(USERId);
    }
}

export const walletService = new WalletService();
