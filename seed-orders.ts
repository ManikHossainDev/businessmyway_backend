import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { OrderModel } from './src/modules/orders/order.model';

dotenv.config();

const seedOrders = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to MongoDB');

        // Fetch a user and a product to link
        const User = mongoose.model('User');
        let user = await User.findOne({ email: 'se.manik.js@gmail.com' });
        if (!user) {
            console.log('Target user not found. Creating user Manik Hossain...');
            user = await User.create({
                name: 'Manik Hossain',
                email: 'se.manik.js@gmail.com',
                password: 'password123',
                phone: '+44123456789',
                role: 'user',
            });
        }

        const Product = mongoose.model('Product');
        let product = await Product.findOne();
        if (!product) {
            console.log('No product found. Creating a default product...');
            product = await Product.create({
                name: 'Test Product ' + Date.now(),
                slug: 'test-product-' + Date.now(),
                price: 19.99,
                stockQty: 100,
                description: 'A nice product for testing.',
                category: new mongoose.Types.ObjectId(), // Needs valid category
                brand: new mongoose.Types.ObjectId(),
            });
        }

        const orders = [
            {
                user: user._id,
                orderNumber: 'BMW-' + Date.now().toString(36).toUpperCase() + '1',
                items: [
                    {
                        product: product._id,
                        name: product.name,
                        image: product.image || product.images?.[0] || '',
                        price: product.price,
                        qty: 1,
                    },
                ],
                subtotal: product.price,
                deliveryFee: 4.99,
                total: product.price + 4.99,
                status: 'pending',
                deliveryType: 'standard',
                customer: {
                    name: user.name || 'Test User',
                    phone: '+44 123 456 789',
                    email: user.email || 'test@user.com',
                    location: '123 Fake Street, London',
                },
            },
            {
                user: user._id,
                orderNumber: 'BMW-' + Date.now().toString(36).toUpperCase() + '2',
                items: [
                    {
                        product: product._id,
                        name: product.name,
                        image: product.image || product.images?.[0] || '',
                        price: product.price,
                        qty: 2,
                    },
                ],
                subtotal: product.price * 2,
                deliveryFee: 4.99,
                total: product.price * 2 + 4.99,
                status: 'pending',
                deliveryType: 'standard',
                customer: {
                    name: user.name || 'Test User',
                    phone: '+44 123 456 789',
                    email: user.email || 'test@user.com',
                    location: '123 Fake Street, London',
                },
                paidAt: new Date(),
            },
            {
                user: user._id,
                orderNumber: 'BMW-' + Date.now().toString(36).toUpperCase() + '3',
                items: [
                    {
                        product: product._id,
                        name: product.name,
                        image: product.image || product.images?.[0] || '',
                        price: product.price,
                        qty: 1,
                    },
                ],
                subtotal: product.price,
                deliveryFee: 9.99,
                total: product.price + 9.99,
                status: 'on_the_way',
                deliveryType: 'express',
                customer: {
                    name: user.name || 'Test User',
                    phone: '+44 123 456 789',
                    email: user.email || 'test@user.com',
                    location: '123 Fake Street, London',
                },
                shippingInfo: {
                    company: 'Royal Mail',
                    trackingId: 'RM123456789GB',
                    shippingDate: new Date(),
                    estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // +2 days
                },
                paidAt: new Date(),
            },
            {
                user: user._id,
                orderNumber: 'BMW-' + Date.now().toString(36).toUpperCase() + '4',
                items: [
                    {
                        product: product._id,
                        name: product.name,
                        image: product.image || product.images?.[0] || '',
                        price: product.price,
                        qty: 3,
                    },
                ],
                subtotal: product.price * 3,
                deliveryFee: 0,
                total: product.price * 3,
                status: 'delivered',
                deliveryType: 'express',
                customer: {
                    name: user.name || 'Test User',
                    phone: '+44 123 456 789',
                    email: user.email || 'test@user.com',
                    location: '123 Fake Street, London',
                },
                shippingInfo: {
                    company: 'DPD',
                    trackingId: 'DPD987654321',
                    shippingDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // -3 days
                    estimatedDeliveryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // -1 days
                },
                paidAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            },
        ];

        for (const orderData of orders) {
            await OrderModel.create(orderData);
            console.log(`Created fake order: ${orderData.orderNumber} with status ${orderData.status}`);
        }

        console.log('Seed completed successfully!');
    } catch (error) {
        console.error('Error seeding orders:', error);
    } finally {
        await mongoose.disconnect();
    }
};

// We need to register User and Product schema before running
import './src/modules/user/user.model';
import './src/modules/products/product.model';

seedOrders();
