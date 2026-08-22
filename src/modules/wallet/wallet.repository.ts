import type {
    RepositoryQueryOptions,
    RepositoryWriteOptions,
} from '@/core/interfaces/repository.interface';
import { BaseMongooseRepository } from '@/infrastructure/database/base.repository';
import type { IWalletDocument, UpdateWalletInput } from './wallet.interface';
import { WalletModel } from './wallet.model';

export class WalletRepository extends BaseMongooseRepository<IWalletDocument> {
    constructor() {
        super(WalletModel);
    }

    async findByUSERId(
        USERId: string,
        options?: RepositoryQueryOptions,
    ): Promise<IWalletDocument | null> {
        return this.model
            .findOne({ USERId })
            .lean<IWalletDocument>() as Promise<IWalletDocument | null>;
    }

    async updateByUSERId(
        USERId: string,
        data: Partial<UpdateWalletInput>,
        options?: RepositoryWriteOptions,
    ): Promise<IWalletDocument | null> {
        return this.model
            .findOneAndUpdate({ USERId }, data, { new: true, runValidators: true })
            .lean<IWalletDocument>() as Promise<IWalletDocument | null>;
    }
}

export const walletRepository = new WalletRepository();
