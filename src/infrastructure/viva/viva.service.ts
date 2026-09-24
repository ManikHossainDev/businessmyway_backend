import { config } from '@/config';
import { BadRequestError } from '@/core/errors';
import { logger } from '@/infrastructure/logger/winston.logger';

export interface CreateVivaOrderInput {
    orderNumber: string;
    amount: number;
    customerEmail: string;
    customerName: string;
    customerPhone: string;
    countryCode?: string;
    customerTrns?: string;
}

export interface VivaPaymentOrderResult {
    orderCode: string;
    checkoutUrl: string;
}

export interface VivaTransactionResult {
    transactionId: string;
    orderCode?: string;
    statusId: string;
    amount?: number;
    currencyCode?: string;
    customerTrns?: string;
    merchantTrns?: string;
    fullName?: string;
    email?: string;
    rawData?: unknown;
}

class VivaService {
    private cachedToken: string | null = null;
    private tokenExpiresAt: number = 0;

    /**
     * Obtain OAuth 2.0 Bearer Token with in-memory caching
     */
    async getAccessToken(): Promise<string> {
        const now = Date.now();
        if (this.cachedToken && this.tokenExpiresAt > now + 60_000) {
            return this.cachedToken;
        }

        const { clientId, clientSecret, accountsUrl } = config.viva;

        if (!clientId || !clientSecret) {
            logger.warn('Viva Payments Client ID or Secret is missing in configuration.');
            throw new BadRequestError(
                'Viva Payments credentials are not configured. Please set VIVA_CLIENT_ID and VIVA_CLIENT_SECRET in backend/.env',
                'VIVA_CREDENTIALS_MISSING',
            );
        }

        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenEndpoint = `${accountsUrl.replace(/\/$/, '')}/connect/token`;

        try {
            const response = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                }).toString(),
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error('Failed to obtain Viva access token', {
                    status: response.status,
                    error: errorText,
                });
                throw new BadRequestError(
                    `Failed to authenticate with Viva Payments (${response.status}). Check credentials.`,
                    'VIVA_AUTH_FAILED',
                );
            }

            const data = (await response.json()) as { access_token: string; expires_in: number };
            this.cachedToken = data.access_token;
            // expires_in is in seconds
            this.tokenExpiresAt = now + (data.expires_in || 3600) * 1000;

            return this.cachedToken;
        } catch (error) {
            if (error instanceof BadRequestError) throw error;
            logger.error('Network error during Viva token request', {
                error: error instanceof Error ? error.message : error,
            });
            throw new BadRequestError(
                'Unable to connect to Viva Payments authentication service.',
                'VIVA_AUTH_NETWORK_ERROR',
            );
        }
    }

    /**
     * Create a Viva Smart Checkout Payment Order (POST /checkout/v2/orders)
     */
    async createOrder(input: CreateVivaOrderInput): Promise<VivaPaymentOrderResult> {
        const token = await this.getAccessToken();
        const { apiUrl, checkoutUrl, sourceCode } = config.viva;

        const endpoint = `${apiUrl.replace(/\/$/, '')}/checkout/v2/orders`;
        // Viva amount is in cents / pence (integer)
        const amountInCents = Math.round(input.amount * 100);

        const payload = {
            amount: amountInCents,
            customerTrns: input.customerTrns || `Order #${input.orderNumber}`,
            customer: {
                email: input.customerEmail,
                fullName: input.customerName,
                phone: input.customerPhone,
                countryCode: input.countryCode || 'GB',
                requestLang: 'en-GB',
            },
            paymentTimeout: 1800,
            preauth: false,
            allowRecurring: false,
            maxInstallments: 0,
            paymentNotification: true,
            tipAmount: 0,
            disableExactAmount: false,
            disableCash: true,
            disablePayAtStore: true,
            sourceCode: sourceCode || 'Default',
            merchantTrns: input.orderNumber,
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const rawText = await response.text();

            if (!response.ok) {
                logger.error('Failed to create Viva checkout order', {
                    status: response.status,
                    error: rawText,
                });
                throw new BadRequestError(
                    `Viva Payments order creation failed (${response.status}): ${rawText}`,
                    'VIVA_CREATE_ORDER_FAILED',
                );
            }

            // Extract orderCode safely using regex to prevent JS 64-bit integer overflow
            const match = rawText.match(/"orderCode"\s*:\s*"?(\d+)"?/);
            let orderCode = match ? match[1] : '';

            if (!orderCode) {
                const parsed = JSON.parse(rawText);
                orderCode = String(parsed.orderCode || '');
            }

            if (!orderCode) {
                throw new BadRequestError(
                    'Viva Payments did not return an orderCode.',
                    'VIVA_ORDER_CODE_MISSING',
                );
            }

            const redirectUrl = `${checkoutUrl.replace(/\/$/, '')}/web/checkout?ref=${orderCode}`;

            return {
                orderCode,
                checkoutUrl: redirectUrl,
            };
        } catch (error) {
            if (error instanceof BadRequestError) throw error;
            logger.error('Network error during Viva create order request', {
                error: error instanceof Error ? error.message : error,
            });
            throw new BadRequestError(
                'Unable to create checkout order with Viva Payments.',
                'VIVA_NETWORK_ERROR',
            );
        }
    }

    /**
     * Retrieve transaction details to verify payment status (GET /checkout/v2/transactions/{id})
     */
    async retrieveTransaction(transactionId: string): Promise<VivaTransactionResult> {
        const token = await this.getAccessToken();
        const { apiUrl } = config.viva;

        const endpoint = `${apiUrl.replace(/\/$/, '')}/checkout/v2/transactions/${encodeURIComponent(transactionId)}`;

        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const rawText = await response.text();

            if (!response.ok) {
                logger.error('Failed to retrieve Viva transaction', {
                    status: response.status,
                    transactionId,
                    error: rawText,
                });
                throw new BadRequestError(
                    `Failed to verify transaction with Viva Payments (${response.status}).`,
                    'VIVA_TRANSACTION_FETCH_FAILED',
                );
            }

            // Extract orderCode safely
            const orderCodeMatch = rawText.match(/"orderCode"\s*:\s*"?(\d+)"?/);
            const parsed = JSON.parse(rawText);

            return {
                transactionId: String(parsed.transactionId || parsed.id || transactionId),
                orderCode: orderCodeMatch ? orderCodeMatch[1] : String(parsed.orderCode || ''),
                statusId: String(parsed.statusId || ''),
                amount: parsed.amount ? Number(parsed.amount) / 100 : undefined,
                currencyCode: parsed.currencyCode,
                customerTrns: parsed.customerTrns,
                merchantTrns: parsed.merchantTrns,
                fullName: parsed.fullName,
                email: parsed.email,
                rawData: parsed,
            };
        } catch (error) {
            if (error instanceof BadRequestError) throw error;
            logger.error('Network error during Viva retrieve transaction', {
                error: error instanceof Error ? error.message : error,
            });
            throw new BadRequestError(
                'Unable to verify transaction with Viva Payments.',
                'VIVA_VERIFY_NETWORK_ERROR',
            );
        }
    }

    /**
     * Get webhook verification key for Viva Webhook handshake
     */
    async getWebhookVerificationKey(): Promise<string> {
        if (config.viva.webhookVerificationKey) {
            return config.viva.webhookVerificationKey;
        }

        const { merchantId, apiKey, env } = config.viva;
        if (!merchantId || !apiKey) {
            return '';
        }

        const tokenBaseUrl = env === 'production' ? 'https://www.vivapayments.com' : 'https://demo.vivapayments.com';

        try {
            const credentials = Buffer.from(`${merchantId}:${apiKey}`).toString('base64');
            const response = await fetch(`${tokenBaseUrl}/api/messages/config/token`, {
                method: 'GET',
                headers: {
                    Authorization: `Basic ${credentials}`,
                },
            });

            if (response.ok) {
                const data = (await response.json()) as { Key?: string };
                return data.Key || '';
            }
        } catch (error) {
            logger.warn('Failed to fetch Viva webhook key automatically', {
                error: error instanceof Error ? error.message : error,
            });
        }

        return '';
    }
}

export const vivaService = new VivaService();
