import crypto from 'node:crypto';

export interface UniqueOtpOptions {
    expiresInMinutes: number;
    digits?: number;
    now?: Date;
}

export interface UniqueOtpResult {
    otp: string;
    expiresAt: Date;
}

export const getUniqueOtpCode = (options: UniqueOtpOptions): UniqueOtpResult => {
    const digits = options.digits ?? 5;
    const max = 10 ** digits;
    const otp = crypto.randomInt(0, max).toString().padStart(digits, '0');
    const now = options.now ?? new Date();

    return {
        otp,
        expiresAt: new Date(now.getTime() + options.expiresInMinutes * 60_000),
    };
};