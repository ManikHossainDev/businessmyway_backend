import type { RequestHandler } from 'express';
import { catchAsync } from '@/shared/utils/catchAsync';
import { HTTP_STATUS } from '@/core/constants/httpStatus';
import { sendResponse } from '@/shared/utils/sendResponse';
import { getDevOtp } from '@/infrastructure/events/listeners/auth.listeners';
import { getMailLogs } from '@/infrastructure/mail/mail.log';

const getOtp: RequestHandler = catchAsync(async (req, res) => {
    const email = (req.query.email as string) || '';
    if (!email) {
        return sendResponse(res, { statusCode: HTTP_STATUS.BAD_REQUEST, message: 'Email is required', data: null });
    }
    const otp = getDevOtp(email);
    if (!otp) {
        return sendResponse(res, { statusCode: HTTP_STATUS.NOT_FOUND, message: 'No active OTP found for this email', data: null });
    }
    return sendResponse(res, { statusCode: HTTP_STATUS.OK, message: 'OTP retrieved', data: { email, otp } });
});

const getMailbox: RequestHandler = catchAsync(async (_req, res) => {
    const emails = getMailLogs();
    return sendResponse(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Mail log retrieved',
        data: { count: emails.length, emails },
    });
});

export const devController = { getOtp, getMailbox };
