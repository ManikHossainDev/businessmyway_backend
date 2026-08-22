import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '@/config';
import { sesTransport } from './ses.transport';
import { logger } from '../logger/winston.logger';

let transporter: Transporter | null = null;
let transportVerified = false;

export const getMailTransporter = (): Transporter => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: config.mail.host,
            port: config.mail.port,
            secure: config.mail.port === 465,
            auth: config.mail.user && config.mail.pass
                ? { user: config.mail.user, pass: config.mail.pass }
                : undefined,
            tls: {
                rejectUnauthorized: false,
            },
        });
    }
    return transporter;
};

export const sendMail = async (options: { from: string; to: string; subject: string; html: string }): Promise<void> => {
    const isSes = config.storage.mode === 's3';
    if (isSes) {
        logger.info('Sending email via SES (floci)', { to: options.to, subject: options.subject });
        await sesTransport.sendMail({
            ...options,
            from: config.aws.sesFromEmail,
        });
    } else {
        logger.info('Sending email via SMTP', { to: options.to, subject: options.subject });
        const t = getMailTransporter();
        await t.sendMail(options);
    }
};

export const verifyMailTransport = async (): Promise<void> => {
    if (config.isTest || transportVerified) return;
    try {
        await getMailTransporter().verify();
        transportVerified = true;
        logger.info('SMTP transporter verified', { host: config.mail.host, port: config.mail.port });
    } catch {
        logger.warn('SMTP not available — check SMTP_HOST/PORT/USER/PASS in .env');
    }
};
