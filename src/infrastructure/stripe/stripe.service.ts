import type Stripe from 'stripe';
import { config } from '@/config';
import { stripe } from './stripe.client';
import type { PaymentTypeValue } from '@/modules/payments/payment.interface';

export interface CreateCheckoutSessionInput {
    userId: string;
    paymentId: string;
    paymentType: PaymentTypeValue;
    productName: string;
    amount: number;
}

export class StripeService {
    async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<Stripe.Checkout.Session> {
        return stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: config.stripe.currency,
                        product_data: { name: input.productName },
                        unit_amount: Math.round(input.amount * 100),
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                userId: input.userId,
                paymentId: input.paymentId,
                paymentType: input.paymentType,
            },
            success_url: `${config.serverBaseUrl}/payment/success?paymentId=${input.paymentId}&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.serverBaseUrl}/payment/cancel?paymentId=${input.paymentId}`,
        });
    }

    verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event {
        return stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
    }

    async retrievePaymentIntentWithCharge(intentId: string): Promise<Stripe.PaymentIntent> {
        return stripe.paymentIntents.retrieve(intentId, {
            expand: ['latest_charge'],
        });
    }
}

export const stripeService = new StripeService();
