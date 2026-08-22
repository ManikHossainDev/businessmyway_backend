import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { config } from '@/config';
import { logger } from '../logger/winston.logger';

export class SesTransport {
    private readonly client: SESv2Client;

    constructor() {
        this.client = new SESv2Client({
            endpoint: config.aws.endpoint,
            region: config.aws.region,
            credentials: {
                accessKeyId: config.aws.accessKeyId,
                secretAccessKey: config.aws.secretAccessKey,
            },
        });
    }

    async sendMail(options: {
        from: string;
        to: string;
        subject: string;
        html: string;
    }): Promise<void> {
        try {
            await this.client.send(
                new SendEmailCommand({
                    FromEmailAddress: options.from,
                    Destination: {
                        ToAddresses: [options.to],
                    },
                    Content: {
                        Simple: {
                            Subject: { Data: options.subject },
                            Body: {
                                Html: { Data: options.html },
                            },
                        },
                    },
                }),
            );
            logger.info('Email sent via SES', { to: options.to, subject: options.subject });
        } catch (error) {
            logger.error('Failed to send email via SES', {
                to: options.to,
                subject: options.subject,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}

export const sesTransport = new SesTransport();
