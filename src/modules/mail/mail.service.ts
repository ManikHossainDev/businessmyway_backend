// backend/src/modules/mail/mail.service.ts
import nodemailer from 'nodemailer';
import { EMAIL_CONFIG } from './mail.constants';

let transporter: nodemailer.Transporter;

const initTransporter = () => {
  if (transporter) return transporter;
  const { host, port, secure, user, pass } = EMAIL_CONFIG;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
  return transporter;
};

export const sendMail = async (to: string, subject: string, html: string) => {
  const client = initTransporter();
  const info = await client.sendMail({
    from: EMAIL_CONFIG.from,
    to,
    subject,
    html,
  });
  return info;
};
