import ejs from 'ejs';
import path from 'node:path';

import { config } from '@/config';
import { logger } from '../logger/winston.logger';
import { sendMail } from './mail.transport';
import type { IMailService, SendMailOptions } from '@/core/interfaces/mail.interface';

const templatesRoot = path.resolve(process.cwd(), 'templates', 'email');

const resolveTemplatePath = (template: string): string => {
    const normalized = template.endsWith('.ejs') ? template : `${template}.ejs`;
    return path.resolve(templatesRoot, normalized);
};

export class MailService implements IMailService {
    async send(options: SendMailOptions): Promise<void> {
        try {
            const templatePath = resolveTemplatePath(options.template);
            const context = {
                ...options.context,
                appName: config.app.name,
                serverBaseUrl: config.serverBaseUrl,
            };
            const html = await ejs.renderFile(templatePath, context);
            await sendMail({
                from: config.mail.from,
                to: options.to,
                subject: options.subject,
                html,
            });
        } catch (error) {
            logger.error('Failed to send email', {
                to: options.to,
                subject: options.subject,
                template: options.template,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}

export const mailService = new MailService();
