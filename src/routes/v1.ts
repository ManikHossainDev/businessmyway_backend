import { Router } from 'express';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { HealthService } from '@/infrastructure/health/health.service';
import { authenticate } from '@/shared/middlewares/authenticate';
import { uploadSingle, setUploadDir } from '@/shared/middlewares/upload';
import { config } from '@/config';
import { getStorageService } from '@/infrastructure/storage';
import { getFileUrl } from '@/infrastructure/storage/local-storage';
import { s3StorageService } from '@/infrastructure/storage/s3.service';

import authRoutes from '@/modules/auth/auth.routes';
import userRoutes from '@/modules/user/user.routes';
import walletRoutes from '@/modules/wallet/wallet.routes';
import notificationRoutes from '@/modules/notification/notification.routes';
import settingRoutes from '@/modules/settings/settings.routes';
import adminRoutes from '@/modules/admin/admin.routes';
import devRoutes from '@/modules/dev/dev.routes';

const router = Router();
const healthService = new HealthService();

router.get(
    '/health',
    catchAsync(async (_req, res) => {
        const report = await healthService.check();
        const statusCode = report.status === 'down' ? HTTP_STATUS.SERVICE_UNAVAILABLE : HTTP_STATUS.OK;

        return sendResponse(res, {
            statusCode,
            message: 'Health report fetched successfully.',
            data: report,
        });
    }),
);

router.post(
    '/upload',
    authenticate,
    setUploadDir('general'),
    uploadSingle('file'),
    catchAsync(async (req, res) => {
        const file = req.file;
        if (!file) {
            return sendResponse(res, {
                statusCode: HTTP_STATUS.BAD_REQUEST,
                message: 'No file uploaded.',
                data: null,
            });
        }

        if (config.storage.mode === 's3') {
            const fs = await import('node:fs');
            const folder = (req as any).uploadDir || 'general';
            const buffer = fs.readFileSync(file.path);
            const result = await s3StorageService.upload(buffer, folder, file.filename);
            fs.unlinkSync(file.path);
            return sendResponse(res, {
                statusCode: HTTP_STATUS.OK,
                message: 'File uploaded successfully.',
                data: { url: result.url, publicId: result.publicId, mimetype: file.mimetype, size: file.size },
            });
        }

        const url = getFileUrl(file.filename, (req as any).uploadDir || '');
        return sendResponse(res, {
            statusCode: HTTP_STATUS.OK,
            message: 'File uploaded successfully.',
            data: { url, filename: file.filename, mimetype: file.mimetype, size: file.size },
        });
    }),
);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/wallets', walletRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingRoutes);
router.use('/admin', adminRoutes);
router.use('/dev', devRoutes);

export default router;
