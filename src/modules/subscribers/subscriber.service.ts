import { SubscriberModel } from './subscriber.model';
import { UserModel } from '@/modules/user/user.model';
import type { ISubscriberDocument } from './subscriber.interface';
import { ConflictError, NotFoundError } from '@/core/errors';
import { MESSAGES } from '@/core/constants/messages';
import { mailService } from '@/infrastructure/mail/mail.service';
import { serializeSubscriber, type SubscriberUserInfo } from './subscriber.serializer';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatPhone = (countryCode?: string, phone?: string) => {
    const code = countryCode?.trim() || '';
    const number = phone?.trim() || '';
    return [code, number].filter(Boolean).join(' ');
};

export class SubscriberService {
    async list() {
        const subscribers = await SubscriberModel.find()
            .sort({ createdAt: -1 })
            .lean<ISubscriberDocument[]>();

        const emails = subscribers.map((item) => item.email.toLowerCase());
        const users = emails.length
            ? await UserModel.find({
                  email: { $in: emails },
                  isDeleted: false,
              })
                  .select('name email phone countryCode avatar')
                  .lean()
            : [];

        const usersByEmail = new Map(
            users.map((user) => [String(user.email).toLowerCase(), user]),
        );

        return subscribers.map((subscriber) => {
            const user = usersByEmail.get(subscriber.email.toLowerCase());
            const userInfo: SubscriberUserInfo = user
                ? {
                      name: user.name || '',
                      phone: formatPhone(user.countryCode, user.phone),
                      avatar: user.avatar || '',
                  }
                : null;
            return serializeSubscriber(subscriber, userInfo);
        });
    }

    async create(payload: { email: string; agreed: boolean }): Promise<ISubscriberDocument> {
        const exists = await SubscriberModel.findOne({
            email: { $regex: `^${escapeRegex(payload.email)}$`, $options: 'i' },
        }).lean();

        if (exists) {
            throw new ConflictError(MESSAGES.SUBSCRIBER.ALREADY_EXISTS, 'SUBSCRIBER_EXISTS');
        }

        return SubscriberModel.create({
            email: payload.email,
            agreed: payload.agreed,
        });
    }

    async sendEmail(id: string, payload: { subject: string; message: string }) {
        const subscriber = await SubscriberModel.findById(id).lean<ISubscriberDocument>();
        if (!subscriber) {
            throw new NotFoundError(MESSAGES.SUBSCRIBER.NOT_FOUND, 'SUBSCRIBER_NOT_FOUND');
        }

        const user = await UserModel.findOne({
            email: subscriber.email,
            isDeleted: false,
        })
            .select('name')
            .lean();

        await mailService.send({
            to: subscriber.email,
            subject: payload.subject,
            template: 'subscriber-message',
            context: {
                name: user?.name || subscriber.email,
                subject: payload.subject,
                message: payload.message,
            },
        });

        return { email: subscriber.email };
    }
}

export const subscriberService = new SubscriberService();
