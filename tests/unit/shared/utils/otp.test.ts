import { getUniqueOtpCode } from '../../../../src/shared/utils/otp';

describe('getUniqueOtpCode', () => {
    it('returns a 5-digit otp and a matching expiry date', () => {
        const now = new Date('2030-01-01T00:00:00.000Z');

        const result = getUniqueOtpCode({
            expiresInMinutes: 10,
            now,
        });

        expect(result.otp).toMatch(/^\d{5}$/);
        expect(result.expiresAt.toISOString()).toBe('2030-01-01T00:10:00.000Z');
    });

    it('supports custom digit lengths', () => {
        const result = getUniqueOtpCode({
            expiresInMinutes: 1,
            digits: 6,
            now: new Date('2030-01-01T00:00:00.000Z'),
        });

        expect(result.otp).toMatch(/^\d{6}$/);
    });
});