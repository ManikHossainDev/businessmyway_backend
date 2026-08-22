import { Queue, Worker, type Job } from 'bullmq';
import { bullRedisConnection } from './bull.connection';
import { mailService } from '@/infrastructure/mail/mail.service';
import { logger } from '@/infrastructure/logger/winston.logger';

export interface PaymentEmailJobData {
    to: string;
    userName: string;
    subscriptionTitle: string;
    amount: number;
    currency: string;
    invoiceId: string;
    paymentType: string;
    billingType: string;
    paidAt: string;
    invoiceUrl?: string;
    invoicePdf?: string;
}

const QUEUE_NAME = 'payment-emails';

export const paymentEmailQueue = new Queue(QUEUE_NAME, {
    connection: bullRedisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 3600, count: 500 },
        removeOnFail: { age: 24 * 3600 },
    },
});

export const paymentEmailWorker = new Worker(
    QUEUE_NAME,
    async (job: Job<PaymentEmailJobData>) => {
        const { to, ...context } = job.data;
        await mailService.send({
            to,
            subject: 'Payment Confirmation – Subscription Activated',
            template: 'payment-confirmation',
            context,
        });
        return { success: true, to };
    },
    { connection: bullRedisConnection, concurrency: 3 },
);

paymentEmailWorker.on('completed', (job) => {
    logger.info('Payment email sent', { jobId: job.id, to: job.data.to });
});

paymentEmailWorker.on('failed', (job, error) => {
    logger.error('Payment email failed', { jobId: job?.id, to: job?.data?.to, error: error.message });
});

export const enqueuePaymentEmail = async (data: PaymentEmailJobData): Promise<void> => {
    await paymentEmailQueue.add('send-payment-email', data, {
        jobId: `payment-email-${data.invoiceId}-${Date.now()}`,
    });
};

export const closePaymentEmailQueue = async (): Promise<void> => {
    await paymentEmailWorker.close();
    await paymentEmailQueue.close();
};
