import type { Request, Response, NextFunction } from 'express';
import { multerUpload, productImageUpload, uploadSingleImage } from '@/infrastructure/storage/multer.config';

export const setUploadDir = (subDir: string) => (req: Request, _res: Response, next: NextFunction) => {
    (req as any).uploadDir = subDir;
    next();
};

export const uploadSingle = (fieldName: string, subDir?: string) => {
    const middleware = multerUpload.single(fieldName);
    if (!subDir) return middleware;
    return (req: Request, res: Response, next: NextFunction) => {
        (req as any).uploadDir = subDir;
        middleware(req, res, next);
    };
};

export const uploadFields = (fields: { name: string; maxCount?: number }[], subDir?: string) => {
    const middleware = multerUpload.fields(fields);
    if (!subDir) return middleware;
    return (req: Request, res: Response, next: NextFunction) => {
        (req as any).uploadDir = subDir;
        middleware(req, res, next);
    };
};

export const uploadImages = productImageUpload;

export const uploadSingleImageMiddleware = uploadSingleImage;