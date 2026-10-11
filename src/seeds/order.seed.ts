import fs from 'node:fs';
import path from 'node:path';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';
import { logger } from '@/infrastructure/logger/winston.logger';
import { OrderModel } from '@/modules/orders/order.model';
import { ORDER_STATUS, DELIVERY_TYPES } from '@/modules/orders/order.interface';
import { UserModel } from '@/modules/user/user.model';
import { ProductModel } from '@/modules/products/product.model';
import { ROLES } from '@/core/constants/roles';

function generateSamplePdfBuffer(orderNumber: string, customerName: string, total: number, dateStr: string): Buffer {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    const streamLines: string[] = [
        '0.1 0.1 0.1 rg',
        `0 ${pageHeight - 90} ${pageWidth} 90 re f`,
        '0.75 0.55 0.18 rg',
        `0 ${pageHeight - 93} ${pageWidth} 3 re f`,
        'BT',
        '/F2 20 Tf',
        '1 1 1 rg',
        `${margin} ${pageHeight - 52} Td`,
        '(BRITISH SMOKES) Tj',
        'ET',
        'BT',
        '/F1 10 Tf',
        '0.8 0.8 0.8 rg',
        `${margin} ${pageHeight - 70} Td`,
        '(Official Order Invoice & Receipt) Tj',
        'ET',
        'BT',
        '/F2 22 Tf',
        '0.75 0.55 0.18 rg',
        `${pageWidth - margin - 110} ${pageHeight - 55} Td`,
        '(INVOICE) Tj',
        'ET',
        'BT',
        '/F2 10 Tf',
        '0.15 0.15 0.15 rg',
        `${margin} ${pageHeight - 130} Td`,
        '(Invoice Number:) Tj',
        '/F1 10 Tf',
        ` ( #${orderNumber}) Tj`,
        'ET',
        'BT',
        '/F2 10 Tf',
        '0.15 0.15 0.15 rg',
        `${pageWidth - margin - 160} ${pageHeight - 130} Td`,
        '(Date:) Tj',
        '/F1 10 Tf',
        ` (${dateStr}) Tj`,
        'ET',
        '0.96 0.95 0.93 rg',
        `${margin} ${pageHeight - 215} ${contentWidth} 65 re f`,
        '0.85 0.82 0.78 RG 1 w',
        `${margin} ${pageHeight - 215} ${contentWidth} 65 re S`,
        'BT',
        '/F2 11 Tf',
        '0.75 0.55 0.18 rg',
        `${margin + 12} ${pageHeight - 165} Td`,
        '(BILLED TO:) Tj',
        'ET',
        'BT',
        '/F2 10 Tf',
        '0.1 0.1 0.1 rg',
        `${margin + 12} ${pageHeight - 180} Td`,
        `(${customerName}) Tj`,
        'ET',
        'BT',
        '/F1 9 Tf',
        '0.35 0.35 0.35 rg',
        `${margin + 12} ${pageHeight - 195} Td`,
        '(Payment Status: Completed / Verified) Tj',
        'ET',
        '0.1 0.1 0.1 rg',
        `${margin} ${pageHeight - 250} ${contentWidth} 22 re f`,
        'BT',
        '/F2 9 Tf',
        '1 1 1 rg',
        `${margin + 10} ${pageHeight - 244} Td`,
        '(ITEM DESCRIPTION) Tj',
        `${contentWidth - 180} 0 Td`,
        '(QTY) Tj',
        '70 0 Td',
        '(TOTAL) Tj',
        'ET',
        'BT',
        '/F1 9 Tf',
        '0.15 0.15 0.15 rg',
        `${margin + 10} ${pageHeight - 280} Td`,
        '(Premium Cigarette & Cigar Selection) Tj',
        `${contentWidth - 180} 0 Td`,
        '(1) Tj',
        '/F2 9 Tf',
        '70 0 Td',
        `(${total.toFixed(2)}) Tj`,
        'ET',
        'BT',
        '/F2 12 Tf',
        '0.75 0.55 0.18 rg',
        `${pageWidth - margin - 180} ${pageHeight - 340} Td`,
        '(Total Paid:) Tj',
        '80 0 Td',
        `(GBP ${total.toFixed(2)}) Tj`,
        'ET',
        '0.85 0.82 0.78 RG 0.5 w',
        `${margin} 80 m ${pageWidth - margin} 80 l S`,
        'BT',
        '/F2 9 Tf',
        '0.75 0.55 0.18 rg',
        `${margin} 62 Td`,
        '(Thank you for your business with British Smokes!) Tj',
        'ET',
    ];

    const streamContent = streamLines.join('\n');
    const streamLength = Buffer.byteLength(streamContent, 'utf8');

    const pdfParts = [
        '%PDF-1.4\n',
        '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
        '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n`,
        '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
        '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
        `6 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    ];

    let offset = 0;
    const offsets: number[] = [0];
    for (const part of pdfParts) {
        offset += Buffer.byteLength(part, 'utf8');
        offsets.push(offset);
    }

    const xref = ['xref\n', `0 ${pdfParts.length + 1}\n`, '0000000000 65535 f \n'];
    for (let i = 0; i < pdfParts.length; i++) {
        xref.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    }

    const startXref = offset;
    const trailer = `trailer\n<< /Size ${pdfParts.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
    return Buffer.from(pdfParts.join('') + xref.join('') + trailer, 'utf8');
}

export const seedOrders = async (): Promise<void> => {
    try {
        const users = await UserModel.find({ isDeleted: false });
        let targetUser = users.find((u) => u.role !== ROLES.SUPER_ADMIN);
        if (!targetUser) {
            targetUser = users[0];
        }

        if (!targetUser) {
            logger.warn('⚠️ No user found in database for order seed. Skipping.');
            return;
        }

        const products = await ProductModel.find().limit(8);

        // Ensure sample invoices directory exists and create sample invoice PDFs
        const invoicesDir = path.join(process.cwd(), 'uploads', 'invoices');
        fs.mkdirSync(invoicesDir, { recursive: true });

        const invoiceFiles = [
            'invoice-bmw-1001.pdf',
            'invoice-bmw-1002.pdf',
            'invoice-bmw-1005.pdf',
            'invoice-bmw-1007.pdf',
        ];

        const sampleTotals = [34.99, 58.5, 110.0, 39.99];
        const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

        for (let i = 0; i < invoiceFiles.length; i++) {
            const fileName = invoiceFiles[i]!;
            const filePath = path.join(invoicesDir, fileName);
            const total = sampleTotals[i] ?? 40.0;
            const orderNum = fileName.replace('invoice-', '').replace('.pdf', '').toUpperCase();
            const pdfBuffer = generateSamplePdfBuffer(orderNum, targetUser.name || 'Valued Customer', total, dateStr);
            fs.writeFileSync(filePath, pdfBuffer);
        }

        // Wipe existing orders to ensure exactly 7 orders
        await OrderModel.deleteMany({});

        const getItem = (index: number, qty = 1) => {
            const prod = products.length > 0 ? products[index % products.length] : undefined;
            if (prod) {
                return {
                    product: prod._id,
                    name: prod.name,
                    image: (prod as any).image || (prod as any).images?.[0] || '',
                    price: prod.price || 15.0,
                    qty,
                };
            }
            return {
                product: targetUser._id, // fallback ObjectId
                name: `British Selection Blend #${index + 1}`,
                image: '',
                price: 15.0,
                qty,
            };
        };

        const ordersData = [
            {
                user: targetUser._id,
                orderNumber: 'BMW-1001',
                items: [getItem(0, 2), getItem(1, 1)],
                subtotal: 30.0,
                deliveryFee: 4.99,
                total: 34.99,
                status: ORDER_STATUS.DELIVERED,
                deliveryType: DELIVERY_TYPES.STANDARD,
                customer: {
                    name: targetUser.name || 'John Smith',
                    phone: targetUser.phone || '+44 7911 123456',
                    email: targetUser.email || 'customer@example.com',
                    location: 'Flat 4B, 22 Baker Street, London NW1 6XE, UK',
                },
                shippingInfo: {
                    company: 'Royal Mail',
                    trackingId: 'RM10019284GB',
                    shippingDate: new Date(Date.now() - 86400000 * 5),
                    estimatedDeliveryDate: new Date(Date.now() - 86400000 * 2),
                },
                invoice: '/uploads/invoices/invoice-bmw-1001.pdf',
                paidAt: new Date(Date.now() - 86400000 * 5),
                createdAt: new Date(Date.now() - 86400000 * 5),
            },
            {
                user: targetUser._id,
                orderNumber: 'BMW-1002',
                items: [getItem(2, 3), getItem(3, 1)],
                subtotal: 48.51,
                deliveryFee: 9.99,
                total: 58.5,
                status: ORDER_STATUS.ON_THE_WAY,
                deliveryType: DELIVERY_TYPES.EXPRESS,
                customer: {
                    name: targetUser.name || 'John Smith',
                    phone: targetUser.phone || '+44 7911 123456',
                    email: targetUser.email || 'customer@example.com',
                    location: '15 Oxford Street, Soho, London W1D 2AU, UK',
                },
                shippingInfo: {
                    company: 'DPD Express',
                    trackingId: 'DPD849201948',
                    shippingDate: new Date(Date.now() - 86400000 * 1),
                    estimatedDeliveryDate: new Date(Date.now() + 86400000 * 1),
                },
                invoice: '/uploads/invoices/invoice-bmw-1002.pdf',
                paidAt: new Date(Date.now() - 86400000 * 2),
                createdAt: new Date(Date.now() - 86400000 * 2),
            },
            {
                user: targetUser._id,
                orderNumber: 'BMW-1003',
                items: [getItem(4, 2)],
                subtotal: 37.01,
                deliveryFee: 4.99,
                total: 42.0,
                status: ORDER_STATUS.PENDING,
                deliveryType: DELIVERY_TYPES.STANDARD,
                customer: {
                    name: targetUser.name || 'John Smith',
                    phone: targetUser.phone || '+44 7911 123456',
                    email: targetUser.email || 'customer@example.com',
                    location: 'Flat 4B, 22 Baker Street, London NW1 6XE, UK',
                },
                invoice: '',
                paidAt: new Date(Date.now() - 86400000 * 1),
                createdAt: new Date(Date.now() - 86400000 * 1),
            },
            {
                user: targetUser._id,
                orderNumber: 'BMW-1004',
                items: [getItem(1, 4), getItem(5, 1)],
                subtotal: 65.26,
                deliveryFee: 9.99,
                total: 75.25,
                status: ORDER_STATUS.PENDING,
                deliveryType: DELIVERY_TYPES.EXPRESS,
                customer: {
                    name: targetUser.name || 'John Smith',
                    phone: targetUser.phone || '+44 7911 123456',
                    email: targetUser.email || 'customer@example.com',
                    location: '12 Kensington Gardens, London W8 4PX, UK',
                },
                invoice: '',
                paidAt: new Date(Date.now() - 43200000),
                createdAt: new Date(Date.now() - 43200000),
            },
            {
                user: targetUser._id,
                orderNumber: 'BMW-1005',
                items: [getItem(0, 5), getItem(2, 2)],
                subtotal: 110.0,
                deliveryFee: 0,
                total: 110.0,
                status: ORDER_STATUS.DELIVERED,
                deliveryType: DELIVERY_TYPES.FREE_DELIVERY,
                customer: {
                    name: targetUser.name || 'John Smith',
                    phone: targetUser.phone || '+44 7911 123456',
                    email: targetUser.email || 'customer@example.com',
                    location: 'Flat 4B, 22 Baker Street, London NW1 6XE, UK',
                },
                shippingInfo: {
                    company: 'Royal Mail Tracked 24',
                    trackingId: 'RM554902194GB',
                    shippingDate: new Date(Date.now() - 86400000 * 8),
                    estimatedDeliveryDate: new Date(Date.now() - 86400000 * 6),
                },
                invoice: '/uploads/invoices/invoice-bmw-1005.pdf',
                paidAt: new Date(Date.now() - 86400000 * 8),
                createdAt: new Date(Date.now() - 86400000 * 8),
            },
            {
                user: targetUser._id,
                orderNumber: 'BMW-1006',
                items: [getItem(3, 1)],
                subtotal: 14.99,
                deliveryFee: 4.99,
                total: 19.98,
                status: ORDER_STATUS.PENDING,
                deliveryType: DELIVERY_TYPES.STANDARD,
                customer: {
                    name: targetUser.name || 'John Smith',
                    phone: targetUser.phone || '+44 7911 123456',
                    email: targetUser.email || 'customer@example.com',
                    location: 'Flat 4B, 22 Baker Street, London NW1 6XE, UK',
                },
                invoice: '',
                paidAt: new Date(Date.now() - 10800000),
                createdAt: new Date(Date.now() - 10800000),
            },
            {
                user: targetUser._id,
                orderNumber: 'BMW-1007',
                items: [getItem(4, 1), getItem(1, 2)],
                subtotal: 35.0,
                deliveryFee: 4.99,
                total: 39.99,
                status: ORDER_STATUS.ON_THE_WAY,
                deliveryType: DELIVERY_TYPES.STANDARD,
                customer: {
                    name: targetUser.name || 'John Smith',
                    phone: targetUser.phone || '+44 7911 123456',
                    email: targetUser.email || 'customer@example.com',
                    location: '7 Picadilly Circus, London W1J 0DA, UK',
                },
                shippingInfo: {
                    company: 'Royal Mail 48',
                    trackingId: 'RM88941029GB',
                    shippingDate: new Date(Date.now() - 3600000 * 5),
                    estimatedDeliveryDate: new Date(Date.now() + 86400000 * 2),
                },
                invoice: '/uploads/invoices/invoice-bmw-1007.pdf',
                paidAt: new Date(Date.now() - 3600000 * 6),
                createdAt: new Date(Date.now() - 3600000 * 6),
            },
        ];

        await OrderModel.insertMany(ordersData);
        logger.info('✅ Successfully seeded 7 orders with invoices!');
    } catch (error) {
        logger.error('❌ Failed to seed orders', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
};

if (require.main === module) {
    void (async () => {
        await connectDatabase();
        await seedOrders();
        await disconnectDatabase();
        process.exit(0);
    })();
}
