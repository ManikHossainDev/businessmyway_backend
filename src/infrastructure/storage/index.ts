import { config } from '@/config';
import type { IStorageService } from '@/core/interfaces/storage.interface';
import { logger } from '../logger/winston.logger';
import { s3StorageService } from './s3.service';
import { cloudinaryService } from './cloudinary.service';

let storageService: IStorageService;

export const getStorageService = (): IStorageService => {
    if (!storageService) {
        switch (config.storage.mode) {
            case 's3':
                storageService = s3StorageService;
                logger.info('Storage mode: S3 (floci)');
                break;
            case 'cloudinary':
                storageService = cloudinaryService;
                logger.info('Storage mode: Cloudinary');
                break;
            default:
                throw new Error('Local storage is not supported via IStorageService. Use multer disk storage directly.');
        }
    }
    return storageService;
};

export { s3StorageService } from './s3.service';
export { cloudinaryService } from './cloudinary.service';
export { getFileUrl, getFilePath, UPLOAD_DIRECTORY } from './local-storage';
export { deleteStoredFile, deleteStoredFiles } from './storage.cleanup';
