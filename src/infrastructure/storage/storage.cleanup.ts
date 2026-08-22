import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '@/config';
import { logger } from '../logger/winston.logger';
import { s3StorageService } from './s3.service';
import { cloudinaryService } from './cloudinary.service';
import { UPLOAD_DIRECTORY } from './local-storage';

/**
 * Derive the S3 object key from a stored URL of the form
 * `${endpoint}/${bucket}/${key}`.
 */
const extractS3Key = (url: string): string | null => {
    const marker = `/${config.aws.s3Bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
};

/**
 * Derive the public_id from a Cloudinary URL, e.g.
 * `.../upload/v123/profiles/abc.jpg` -> `profiles/abc`.
 */
const extractCloudinaryPublicId = (url: string): string | null => {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
    return match?.[1] ?? null;
};

/**
 * Map a stored local URL (`/uploads/<subDir>/<file>`) to its absolute disk path.
 */
const extractLocalPath = (url: string): string | null => {
    const marker = '/uploads/';
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    const relative = url.slice(idx + marker.length);
    return path.join(UPLOAD_DIRECTORY, relative);
};

/**
 * Best-effort deletion of a single stored file. Resolves the underlying
 * storage target from the active mode and never throws — failures are logged
 * so callers (e.g. admin reject) are never broken by a cleanup error.
 */
export const deleteStoredFile = async (url: string | null | undefined): Promise<void> => {
    if (!url || typeof url !== 'string') return;

    try {
        switch (config.storage.mode) {
            case 's3': {
                const key = extractS3Key(url);
                if (key) await s3StorageService.delete(key);
                break;
            }
            case 'cloudinary': {
                const publicId = extractCloudinaryPublicId(url);
                if (publicId) await cloudinaryService.delete(publicId);
                break;
            }
            default: {
                const filePath = extractLocalPath(url);
                if (filePath) await fs.unlink(filePath);
                break;
            }
        }
    } catch (err) {
        // ENOENT (already gone) and any other failure are non-fatal.
        logger.warn('Failed to delete stored file', { url, error: (err as Error)?.message });
    }
};

/**
 * Delete many stored files concurrently, best-effort. Accepts a mix of
 * single URLs and arrays; nullish entries are ignored.
 */
export const deleteStoredFiles = async (
    ...urls: Array<string | null | undefined | Array<string | null | undefined>>
): Promise<void> => {
    const flat = urls.flat();
    await Promise.all(flat.map((u) => deleteStoredFile(u)));
};
