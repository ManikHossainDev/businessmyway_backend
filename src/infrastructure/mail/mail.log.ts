export type MailStatus = 'otp_sent' | 'otp_resent' | 'reset_requested' | 'verified' | 'sent';

export interface MailLogEntry {
    id: string;
    from: string;
    to: string;
    subject: string;
    html: string;
    sentAt: Date;
    status: MailStatus;
    otp?: string;
}

const mailLog: MailLogEntry[] = [];
let idCounter = 0;

export const addMailLog = (entry: Omit<MailLogEntry, 'id' | 'sentAt'>): void => {
    mailLog.unshift({
        ...entry,
        id: `mail_${++idCounter}_${Date.now()}`,
        sentAt: new Date(),
    });
    if (mailLog.length > 100) mailLog.splice(100);
};

export const getMailLogs = (): MailLogEntry[] => [...mailLog];

// Marks the most-recent email for an address as 'verified'
export const markEmailVerified = (toEmail: string): void => {
    const entry = mailLog.find((m) => m.to.toLowerCase() === toEmail.toLowerCase());
    if (entry) entry.status = 'verified';
};
