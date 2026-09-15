// backend/src/modules/mail/mail.constants.ts
/**
 * Centralised email configuration and templates.
 * Adjust the environment variables in your .env file accordingly.
 */
export const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  user: process.env.SMTP_USER || 'user@example.com',
  pass: process.env.SMTP_PASS || 'password',
  from: process.env.EMAIL_FROM || 'no-reply@businessmyway.com',
};

/**
 * Simple template generator for each notification type.
 * It receives the original payload passed to `createNotification` and
 * returns an object with `subject` and `html` fields.
 * You can expand this mapping with richer HTML as needed.
 */
export const EMAIL_TEMPLATES: Record<string, (payload: any) => { subject: string; html: string }> = {
  // Admin creates a new user account
  admin_new_user: (payload) => ({
    subject: `New user created: ${payload.title}`,
    html: `<p>${payload.message}</p>`,
  }),
  // Admin receives a new order
  admin_new_order: (payload) => ({
    subject: `New order: ${payload.title}`,
    html: `<p>${payload.message}</p>`,
  }),
  // Fallback for other types
  default: (payload) => ({
    subject: payload.title || 'Notification',
    html: `<p>${payload.message}</p>`,
  }),
};

/**
 * Helper to fetch the appropriate template – falls back to `default`.
 */
export const getEmailTemplate = (type: string, payload: any) => {
  const generator = EMAIL_TEMPLATES[type] || EMAIL_TEMPLATES['default'];
  return generator!(payload);
};
