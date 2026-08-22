import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export const getFileExtension = (mimetype: string): string => {
    const mimeToExt: Record<string, string> = {
        // Images
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/svg+xml': '.svg',
        'image/bmp': '.bmp',
        'image/tiff': '.tiff',
        'image/heic': '.heic',
        'image/heif': '.heif',
        // Videos
        'video/mp4': '.mp4',
        'video/quicktime': '.mov',
        'video/x-msvideo': '.avi',
        'video/x-matroska': '.mkv',
        'video/webm': '.webm',
        'video/3gpp': '.3gp',
        'video/mpeg': '.mpeg',
        'video/x-ms-wmv': '.wmv',
        'video/x-flv': '.flv',
    };
    return mimeToExt[mimetype] || '.bin';
};
const CHAT_UPLOAD_DIR = path.join(UPLOAD_DIR, 'chat');

export const saveSocketAttachment = (
    data: Buffer,
    mimeType: string,
    originalName: string,
): { url: string; filename: string } => {
    fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
    const ext = getFileExtension(mimeType);
    const filename = `${randomUUID()}${ext}`;
    const filePath = path.join(CHAT_UPLOAD_DIR, filename);
    fs.writeFileSync(filePath, data);
    return { url: `/uploads/chat/${filename}`, filename };
};

export const MAX_FILE_SIZE = 500 * 1024 * 1024;
export const MAX_FILES = 16;

export const multerUpload = multer({
    storage: multer.diskStorage({
        destination: (req, _file, cb) => {
            const subDir = (req as any).uploadDir || '';
            const dir = subDir ? path.join(UPLOAD_DIR, subDir) : UPLOAD_DIR;
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (_req, file, cb) => {
            const ext = getFileExtension(file.mimetype);
            const filename = `${randomUUID()}${ext}`;
            cb(null, filename);
        },
    }),
    limits: {
        fileSize: 500 * 1024 * 1024,
        files: 16,
    },
    fileFilter: (_req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            callback(null, true);
            return;
        }
        callback(new Error('Unsupported file type. Only image and video files are allowed.'));
    },
});

export const productImageUpload = multerUpload.array('images', 10);
export const uploadSingleImage = multerUpload.single('image');