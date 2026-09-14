import { DeliveryModel } from './delivery.model';
import type { IDelivery, IDeliveryDocument } from './delivery.interface';

const DEFAULT_DELIVERY_DATA: IDelivery = {
    maximumPrice: 200,
    standardDelivery: {
        day: '3-5 Business Days',
        price: 4.99,
    },
    expressDelivery: {
        day: '1-2 Business Days',
        price: 9.99,
    },
};

export class DeliveryService {
    async getDelivery(): Promise<IDeliveryDocument> {
        let delivery = await DeliveryModel.findOne();
        if (!delivery) {
            delivery = await DeliveryModel.create(DEFAULT_DELIVERY_DATA);
        }
        return delivery;
    }

    async updateDelivery(data: Partial<IDelivery>): Promise<IDeliveryDocument> {
        let delivery = await DeliveryModel.findOne();
        if (!delivery) {
            delivery = await DeliveryModel.create({
                ...DEFAULT_DELIVERY_DATA,
                ...data,
            });
        } else {
            if (data.maximumPrice !== undefined) delivery.maximumPrice = data.maximumPrice;
            if (data.standardDelivery !== undefined) {
                delivery.standardDelivery = {
                    day: data.standardDelivery.day ?? delivery.standardDelivery.day,
                    price: data.standardDelivery.price ?? delivery.standardDelivery.price,
                };
            }
            if (data.expressDelivery !== undefined) {
                delivery.expressDelivery = {
                    day: data.expressDelivery.day ?? delivery.expressDelivery.day,
                    price: data.expressDelivery.price ?? delivery.expressDelivery.price,
                };
            }
            await delivery.save();
        }
        return delivery;
    }
}

export const deliveryService = new DeliveryService();
