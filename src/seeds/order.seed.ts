import fs from 'node:fs';
import path from 'node:path';
import { connectDatabase, disconnectDatabase } from '@/infrastructure/database/mongoose.connection';
import { logger } from '@/infrastructure/logger/winston.logger';
import { OrderModel } from '@/modules/orders/order.model';
import { ORDER_STATUS, DELIVERY_TYPES } from '@/modules/orders/order.interface';
import { UserModel } from '@/modules/user/user.model';
import { ProductModel } from '@/modules/products/product.model';
import { ROLES } from '@/core/constants/roles';

function escapePdfText(str: string): string {
    return (str || '')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/£/g, '\\243')
        .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
}

function generateSamplePdfBuffer(
    orderNumber: string,
    customerName: string,
    total: number,
    dateStr: string,
    status = 'DELIVERED',
    deliveryType = 'Standard Delivery'
): Buffer {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 35;
    const contentWidth = pageWidth - margin * 2;

    const streamLines: string[] = [];

    const drawRect = (
        x: number,
        y: number,
        w: number,
        h: number,
        fill?: [number, number, number],
        stroke?: [number, number, number],
        lineWidth = 1
    ) => {
        if (stroke) {
            streamLines.push(`${stroke[0].toFixed(3)} ${stroke[1].toFixed(3)} ${stroke[2].toFixed(3)} RG ${lineWidth} w`);
        }
        if (fill && stroke) {
            streamLines.push(`${fill[0].toFixed(3)} ${fill[1].toFixed(3)} ${fill[2].toFixed(3)} rg`);
            streamLines.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B`);
        } else if (fill) {
            streamLines.push(`${fill[0].toFixed(3)} ${fill[1].toFixed(3)} ${fill[2].toFixed(3)} rg`);
            streamLines.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
        } else if (stroke) {
            streamLines.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
        }
    };

    const drawHLine = (x1: number, x2: number, y: number, stroke: [number, number, number], lineWidth = 0.75) => {
        streamLines.push(`${stroke[0].toFixed(3)} ${stroke[1].toFixed(3)} ${stroke[2].toFixed(3)} RG ${lineWidth} w`);
        streamLines.push(`${x1.toFixed(2)} ${y.toFixed(2)} m ${x2.toFixed(2)} ${y.toFixed(2)} l S`);
    };

    const drawText = (
        text: string,
        x: number,
        y: number,
        font: '/F1' | '/F2',
        size: number,
        color: [number, number, number]
    ) => {
        streamLines.push('BT');
        streamLines.push(`${font} ${size} Tf`);
        streamLines.push(`${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)} rg`);
        streamLines.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
        streamLines.push(`(${escapePdfText(text)}) Tj`);
        streamLines.push('ET');
    };

    // Outer container
    const outerX = margin;
    const outerY = 40;
    const outerW = contentWidth;
    const outerH = pageHeight - 80;
    drawRect(outerX, outerY, outerW, outerH, [1, 1, 1], [0.91, 0.91, 0.91], 1);

    const innerLeft = outerX + 22;
    const innerRight = outerX + outerW - 22;
    const innerWidth = innerRight - innerLeft;

    // Header
    const topY = outerY + outerH - 35;
    drawText('BRITISH SMOKES', innerLeft, topY, '/F2', 20, [0.102, 0.102, 0.102]);
    drawText('Official Order Invoice & Receipt', innerLeft, topY - 16, '/F1', 9, [0.42, 0.447, 0.502]);
    drawText('United Kingdom  ·  Support: support@britishsmokes.com', innerLeft, topY - 29, '/F1', 8, [0.61, 0.64, 0.69]);

    drawText('INVOICE', innerRight - 85, topY, '/F2', 20, [0.749, 0.553, 0.184]);

    // Status pill
    const pillW = 68;
    const pillH = 15;
    const pillX = innerRight - pillW;
    const pillY = topY - 28;
    drawText('Status:', pillX - 38, topY - 24, '/F1', 8.5, [0.42, 0.447, 0.502]);
    drawRect(pillX, pillY, pillW, pillH, [0.871, 0.969, 0.925], [0.737, 0.941, 0.855], 0.75);
    drawText('Delivered', pillX + 14, pillY + 4, '/F2', 7.5, [0.012, 0.329, 0.247]);

    drawHLine(innerLeft, innerRight, topY - 42, [0.898, 0.906, 0.922], 0.75);

    // Meta bar
    const metaY = topY - 58;
    drawText(`Invoice Number: #${orderNumber}`, innerLeft, metaY, '/F2', 9, [0.102, 0.102, 0.102]);
    drawText(`Order Date: ${dateStr}`, innerRight - 120, metaY, '/F2', 9, [0.102, 0.102, 0.102]);

    // Side-by-side cards
    const cardGap = 14;
    const cardWidth = (innerWidth - cardGap) / 2;
    const cardHeight = 116;
    const cardY = metaY - 14 - cardHeight;
    const leftCardX = innerLeft;
    const rightCardX = innerLeft + cardWidth + cardGap;

    drawRect(leftCardX, cardY, cardWidth, cardHeight, [0.98, 0.98, 0.973], [0.898, 0.906, 0.922], 0.75);
    drawText('BILLED & DELIVERED TO', leftCardX + 12, cardY + cardHeight - 16, '/F2', 8, [0.749, 0.553, 0.184]);
    drawText(customerName, leftCardX + 12, cardY + cardHeight - 32, '/F2', 9.5, [0.067, 0.094, 0.153]);
    drawText('Phone: +44 7911 123456', leftCardX + 12, cardY + cardHeight - 46, '/F1', 8, [0.35, 0.35, 0.35]);
    drawText('Email: customer@example.com', leftCardX + 12, cardY + cardHeight - 58, '/F1', 8, [0.35, 0.35, 0.35]);
    drawHLine(leftCardX + 12, leftCardX + cardWidth - 12, cardY + cardHeight - 68, [0.88, 0.88, 0.88], 0.5);
    drawText('SHIPPING LOCATION', leftCardX + 12, cardY + cardHeight - 78, '/F2', 6.5, [0.61, 0.64, 0.69]);
    drawText('Flat 4B, 22 Baker Street, London NW1 6XE, UK', leftCardX + 12, cardY + cardHeight - 91, '/F1', 7.5, [0.102, 0.102, 0.102]);

    drawRect(rightCardX, cardY, cardWidth, cardHeight, [0.98, 0.98, 0.973], [0.898, 0.906, 0.922], 0.75);
    drawText('SHIPPING & DISPATCH', rightCardX + 12, cardY + cardHeight - 16, '/F2', 8, [0.749, 0.553, 0.184]);
    drawText(deliveryType, rightCardX + cardWidth - 95, cardY + cardHeight - 16, '/F2', 8, [0.29, 0.33, 0.39]);
    drawText('Carrier / Company:', rightCardX + 12, cardY + cardHeight - 36, '/F1', 8, [0.45, 0.45, 0.45]);
    drawText('Royal Mail', rightCardX + cardWidth - 65, cardY + cardHeight - 36, '/F2', 8, [0.102, 0.102, 0.102]);
    drawHLine(rightCardX + 12, rightCardX + cardWidth - 12, cardY + cardHeight - 43, [0.88, 0.88, 0.88], 0.5);
    drawText('Tracking Number:', rightCardX + 12, cardY + cardHeight - 57, '/F1', 8, [0.45, 0.45, 0.45]);
    drawText(`#RM${orderNumber.replace(/[^0-9]/g, '') || '1001'}GB`, rightCardX + cardWidth - 85, cardY + cardHeight - 57, '/F2', 8, [0.102, 0.102, 0.102]);
    drawHLine(rightCardX + 12, rightCardX + cardWidth - 12, cardY + cardHeight - 64, [0.88, 0.88, 0.88], 0.5);
    drawText('Shipped Date:', rightCardX + 12, cardY + cardHeight - 78, '/F1', 8, [0.45, 0.45, 0.45]);
    drawText(dateStr, rightCardX + cardWidth - 80, cardY + cardHeight - 78, '/F1', 8, [0.20, 0.20, 0.20]);
    drawHLine(rightCardX + 12, rightCardX + cardWidth - 12, cardY + cardHeight - 85, [0.88, 0.88, 0.88], 0.5);
    drawText('Est. Delivery:', rightCardX + 12, cardY + cardHeight - 99, '/F1', 8, [0.45, 0.45, 0.45]);
    drawText('Delivered', rightCardX + cardWidth - 65, cardY + cardHeight - 99, '/F2', 8, [0.012, 0.329, 0.247]);

    // Items Table
    const tableTopY = cardY - 18;
    drawRect(innerLeft, tableTopY - 22, innerWidth, 22, [0.102, 0.102, 0.102]);
    drawText('ITEM DESCRIPTION', innerLeft + 12, tableTopY - 15, '/F2', 7.5, [1, 1, 1]);
    drawText('QTY', innerLeft + 270, tableTopY - 15, '/F2', 7.5, [1, 1, 1]);
    drawText('UNIT PRICE', innerLeft + 340, tableTopY - 15, '/F2', 7.5, [1, 1, 1]);
    drawText('TOTAL', innerRight - 45, tableTopY - 15, '/F2', 7.5, [1, 1, 1]);

    const rowY = tableTopY - 46;
    drawRect(innerLeft, rowY, innerWidth, 24, [1, 1, 1]);
    drawHLine(innerLeft, innerRight, rowY, [0.898, 0.906, 0.922], 0.5);
    drawText('Premium British Tobacco Blend Selection', innerLeft + 12, rowY + 7, '/F2', 8, [0.067, 0.094, 0.153]);
    drawText('1', innerLeft + 275, rowY + 7, '/F1', 8, [0.29, 0.33, 0.39]);
    drawText(`£${(total - 4.99 > 0 ? total - 4.99 : total).toFixed(2)}`, innerLeft + 345, rowY + 7, '/F1', 8, [0.29, 0.33, 0.39]);
    drawText(`£${(total - 4.99 > 0 ? total - 4.99 : total).toFixed(2)}`, innerRight - 55, rowY + 7, '/F2', 8, [0.067, 0.094, 0.153]);

    // Totals card
    const totalsCardW = 215;
    const totalsCardH = 82;
    const totalsX = innerRight - totalsCardW;
    const totalsY = rowY - 14 - totalsCardH;
    drawRect(totalsX, totalsY, totalsCardW, totalsCardH, [0.98, 0.98, 0.973], [0.898, 0.906, 0.922], 0.75);

    const sub = (total - 4.99 > 0 ? total - 4.99 : total).toFixed(2);
    drawText('Subtotal:', totalsX + 12, totalsY + totalsCardH - 16, '/F1', 8, [0.38, 0.42, 0.47]);
    drawText(`£${sub}`, totalsX + totalsCardW - 55, totalsY + totalsCardH - 16, '/F2', 8, [0.067, 0.094, 0.153]);

    drawText(`Delivery Fee (${deliveryType}):`, totalsX + 12, totalsY + totalsCardH - 30, '/F1', 7.5, [0.38, 0.42, 0.47]);
    drawText(total - 4.99 > 0 ? '£4.99' : 'Free', totalsX + totalsCardW - 55, totalsY + totalsCardH - 30, '/F2', 8, [0.067, 0.094, 0.153]);

    drawHLine(totalsX + 12, totalsX + totalsCardW - 12, totalsY + totalsCardH - 38, [0.85, 0.85, 0.85], 0.5);
    drawText('Total Amount:', totalsX + 12, totalsY + totalsCardH - 53, '/F2', 9, [0.067, 0.094, 0.153]);
    drawText(`£${total.toFixed(2)}`, totalsX + totalsCardW - 65, totalsY + totalsCardH - 54, '/F2', 11, [0.749, 0.553, 0.184]);
    drawText(`Paid on ${dateStr}`, totalsX + totalsCardW - 90, totalsY + totalsCardH - 69, '/F2', 7.5, [0.012, 0.329, 0.247]);

    // Footer
    const footerY = outerY + 25;
    drawHLine(innerLeft, innerRight, footerY + 14, [0.898, 0.906, 0.922], 0.75);
    drawText('Thank you for your order with British Smokes!', innerLeft + 130, footerY, '/F2', 8.5, [0.42, 0.447, 0.502]);

    const streamContent = streamLines.join('\n');
    const streamLength = Buffer.byteLength(streamContent, 'utf8');

    const pdfParts = [
        '%PDF-1.4\n',
        '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
        '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
        `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n`,
        '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
        '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
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
                deliveryType: DELIVERY_TYPES.STANDARD,
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
