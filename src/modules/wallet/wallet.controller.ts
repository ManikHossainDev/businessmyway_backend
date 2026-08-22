import type { RequestHandler } from 'express';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { walletService } from './wallet.service';

const getMyWallet: RequestHandler = catchAsync(async (req, res) => {
    const userId = req.user!.id;
    const wallet = await walletService.getByUSERId(userId);
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Wallet fetched successfully.',
        data: wallet,
    });
});

export const walletController = { getMyWallet };
