const TIME_MULTIPLIERS: Record<string, number> = {
    s: 1000,
    m: 1000 * 60,
    h: 1000 * 60 * 60,
    d: 1000 * 60 * 60 * 24,
};

/**
 * Converts "2s", "20m", "24h", "1d", "365d" → milliseconds
 */
export const parseTimeToMs = (value: string): number => {
    const match = value.match(/^(\d+)([smhd])$/);

    if (!match) {
        throw new Error(`Invalid time format: ${value}`);
    }

    const amount = match[1]!;
    const unit = match[2]!;

    return Number(amount) * TIME_MULTIPLIERS[unit]!;
};

/**
 * Returns future expiry Date
 */
export const getExpiryDate = (value: string): Date => {
    const ms = parseTimeToMs(value);
    return new Date(Date.now() + ms);
};