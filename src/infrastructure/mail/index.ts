import { config } from '@/config';
import { logger } from '../logger/winston.logger';
import { mailService, MailService } from './mail.service';
import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';

let transporter: Transporter | null = null;

export const getMailTransporter = (): Transporter => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: config.mail.host,
            port: config.mail.port,
            secure: config.mail.port === 465,
            auth: config.mail.user && config.mail.pass
                ? { user: config.mail.user, pass: config.mail.pass }
                : undefined,
            debug: config.isDevelopment,
            logger: config.isDevelopment,
        });
    }
    return transporter;
};

export { mailService, MailService };
export { sesTransport } from './ses.transport';
