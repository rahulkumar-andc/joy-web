import PDFDocument from 'pdfkit';
import { db } from '../db';
import { orders, orderItems, products, users, invoices } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../logger';

interface InvoiceData {
    order: any;
    items: any[];
    customer: any;
    company: {
        name: string;
        address: string;
        gstin: string;
        email: string;
        phone: string;
    };
}

export class InvoiceService {
    /**
     * Generate PDF invoice for an order
     */
    async generateInvoice(orderId: number): Promise<Buffer> {
        try {
            // Fetch order data
            const invoiceData = await this.fetchInvoiceData(orderId);

            // Generate PDF
            const pdfBuffer = await this.createPDF(invoiceData);

            logger.info(`Invoice generated successfully for order ${orderId}`);
            return pdfBuffer;
        } catch (error) {
            logger.error('Invoice generation failed', { orderId, error });
            throw error;
        }
    }

    /**
     * Fetch all data needed for invoice
     */
    private async fetchInvoiceData(orderId: number): Promise<InvoiceData> {
        // 1. Check for existing snapshot in invoices table
        const [existingInvoice] = await db
            .select()
            .from(invoices)
            .where(eq(invoices.orderId, orderId));

        if (existingInvoice) {
            return existingInvoice.snapshotData as InvoiceData;
        }

        // 2. If no snapshot, fetch live data (First time generation)
        const [order] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId));

        if (!order) throw new Error('Order not found');

        const items = await db
            .select({
                item: orderItems,
                product: products
            })
            .from(orderItems)
            .innerJoin(products, eq(orderItems.productId, products.id))
            .where(eq(orderItems.orderId, orderId));

        if (!items || items.length === 0) throw new Error('Order items not found');

        const [customer] = await db
            .select()
            .from(users)
            .where(eq(users.id, order.userId));

        if (!customer) throw new Error('Customer not found');

        // Construct Data Object
        const invoiceData: InvoiceData = {
            order,
            items,
            customer,
            company: {
                name: 'Steal the Deal',
                address: '123 Fashion Street, Andheri West, Mumbai, Maharashtra - 400058, India',
                gstin: '27AABCU9603R1ZM',
                email: 'support@stealthedeal.com',
                phone: '+91 22 1234 5678'
            }
        };

        // 3. Save Snapshot for future immutability
        try {
            await db.insert(invoices).values({
                orderId: orderId,
                invoiceNumber: `INV-${orderId.toString().padStart(6, '0')}`,
                snapshotData: invoiceData
            });
            logger.info(`Invoice snapshot created for order ${orderId}`);
        } catch (error) {
            // Ignore duplicate key errors if race condition
            logger.warn(`Failed to save invoice snapshot (might already exist): ${error}`);
        }

        return invoiceData;
    }

    /**
     * Create PDF document
     */
    private createPDF(data: InvoiceData): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                bufferPages: true
            });

            const chunks: Buffer[] = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // PDF Content
            this.addHeader(doc, data);
            this.addCompanyAndCustomerDetails(doc, data);
            this.addInvoiceDetails(doc, data);
            this.addItemsTable(doc, data);
            this.addTaxSummary(doc, data);
            this.addFooter(doc, data);

            doc.end();
        });
    }

    /**
     * Add invoice header
     */
    private addHeader(doc: PDFKit.PDFDocument, data: InvoiceData) {
        doc
            .fontSize(28)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('TAX INVOICE', { align: 'center' })
            .moveDown(0.5);

        doc
            .moveTo(50, doc.y)
            .lineTo(545, doc.y)
            .lineWidth(2)
            .stroke();

        doc.moveDown(1);
    }

    /**
     * Add company and customer details side by side
     */
    private addCompanyAndCustomerDetails(doc: PDFKit.PDFDocument, data: InvoiceData) {
        const startY = doc.y;

        // Company details (left side)
        doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text(data.company.name, 50, startY)
            .fontSize(9)
            .font('Helvetica')
            .text(data.company.address, 50, doc.y + 5, { width: 250 })
            .text(`GSTIN: ${data.company.gstin}`, 50, doc.y + 3)
            .text(`Email: ${data.company.email}`, 50, doc.y + 3)
            .text(`Phone: ${data.company.phone}`, 50, doc.y + 3);

        // Customer details (right side)
        const address = data.order.shippingAddress as any;
        doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('BILL TO:', 320, startY)
            .fontSize(9)
            .font('Helvetica')
            .text(address.fullName || data.customer.name, 320, doc.y + 5, { width: 225 })
            .text(address.addressLine1, 320, doc.y + 3, { width: 225 })
            .text(`${address.city}, ${address.state} - ${address.zipCode}`, 320, doc.y + 3, { width: 225 })
            .text(address.country || 'India', 320, doc.y + 3);

        doc.moveDown(2);
    }

    /**
     * Add invoice details (invoice number, date, etc.)
     */
    private addInvoiceDetails(doc: PDFKit.PDFDocument, data: InvoiceData) {
        const invoiceNumber = `INV-${data.order.id.toString().padStart(6, '0')}`;
        const invoiceDate = new Date(data.order.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        const paymentMethod = data.order.codAmount ? 'Cash on Delivery (COD)' : 'Online Payment';

        doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(`Invoice No: `, 50, doc.y, { continued: true })
            .font('Helvetica')
            .text(invoiceNumber)

            .font('Helvetica-Bold')
            .text(`Order ID: `, 50, doc.y + 3, { continued: true })
            .font('Helvetica')
            .text(`#${data.order.id}`)

            .font('Helvetica-Bold')
            .text(`Invoice Date: `, 50, doc.y + 3, { continued: true })
            .font('Helvetica')
            .text(invoiceDate)

            .font('Helvetica-Bold')
            .text(`Payment Mode: `, 50, doc.y + 3, { continued: true })
            .font('Helvetica')
            .text(paymentMethod);

        doc.moveDown(2);
    }

    /**
     * Add itemized table
     */
    private addItemsTable(doc: PDFKit.PDFDocument, data: InvoiceData) {
        const tableTop = doc.y;

        // Table header with background
        doc
            .rect(50, tableTop, 495, 20)
            .fillColor('#f3f4f6')
            .fill();

        doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('Item Description', 60, tableTop + 6)
            .text('Qty', 320, tableTop + 6, { width: 40, align: 'center' })
            .text('Rate', 370, tableTop + 6, { width: 70, align: 'right' })
            .text('Amount', 450, tableTop + 6, { width: 85, align: 'right' });

        // Table rows
        let currentY = tableTop + 25;
        doc.font('Helvetica').fontSize(9);

        data.items.forEach((entry, index) => {
            const itemTotal = Number(entry.item.price) * entry.item.quantity;
            const bgColor = index % 2 === 0 ? '#ffffff' : '#fafafa';

            // Row background
            doc
                .rect(50, currentY - 3, 495, 18)
                .fillColor(bgColor)
                .fill();

            // Product name with size/color if available
            let productDesc = entry.product.name;
            if (entry.item.size) productDesc += ` (Size: ${entry.item.size})`;
            if (entry.item.color) productDesc += ` (Color: ${entry.item.color})`;

            doc
                .fillColor('#000000')
                .text(productDesc, 60, currentY, { width: 250, ellipsis: true })
                .text(entry.item.quantity.toString(), 320, currentY, { width: 40, align: 'center' })
                .text(`₹${Number(entry.item.price).toFixed(2)}`, 370, currentY, { width: 70, align: 'right' })
                .text(`₹${itemTotal.toFixed(2)}`, 450, currentY, { width: 85, align: 'right' });

            currentY += 18;
        });

        // Bottom border
        doc
            .moveTo(50, currentY)
            .lineTo(545, currentY)
            .strokeColor('#e5e7eb')
            .stroke();

        doc.y = currentY + 10;
        doc.moveDown(1);
    }

    /**
     * Add tax summary and total
     */
    private addTaxSummary(doc: PDFKit.PDFDocument, data: InvoiceData) {
        const subtotal = data.items.reduce((sum, entry) => {
            return sum + (Number(entry.item.price) * entry.item.quantity);
        }, 0);

        const shipping = Number(data.order.shippingCost) || 0;

        // GST calculation (18% = 9% CGST + 9% SGST)
        const taxableAmount = subtotal;
        const gstRate = 0.18;
        const cgstRate = 0.09;
        const sgstRate = 0.09;

        const cgst = taxableAmount * cgstRate;
        const sgst = taxableAmount * sgstRate;
        const totalGst = cgst + sgst;

        const grandTotal = subtotal + shipping + totalGst;

        const summaryX = 350;
        const labelWidth = 100;
        const valueWidth = 95;

        // Summary box
        const boxTop = doc.y;
        doc
            .rect(summaryX - 10, boxTop - 5, 205, 95)
            .strokeColor('#e5e7eb')
            .stroke();

        doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#000000')
            .text('Subtotal:', summaryX, doc.y, { width: labelWidth, align: 'left' })
            .text(`₹${subtotal.toFixed(2)}`, summaryX + labelWidth, doc.y - 9, { width: valueWidth, align: 'right' })

            .text('Shipping Charges:', summaryX, doc.y + 5, { width: labelWidth, align: 'left' })
            .text(`₹${shipping.toFixed(2)}`, summaryX + labelWidth, doc.y - 9, { width: valueWidth, align: 'right' })

            .text('CGST (9%):', summaryX, doc.y + 5, { width: labelWidth, align: 'left' })
            .text(`₹${cgst.toFixed(2)}`, summaryX + labelWidth, doc.y - 9, { width: valueWidth, align: 'right' })

            .text('SGST (9%):', summaryX, doc.y + 5, { width: labelWidth, align: 'left' })
            .text(`₹${sgst.toFixed(2)}`, summaryX + labelWidth, doc.y - 9, { width: valueWidth, align: 'right' });

        // Total line
        doc
            .moveTo(summaryX - 5, doc.y + 8)
            .lineTo(540, doc.y + 8)
            .strokeColor('#000000')
            .lineWidth(1)
            .stroke();

        doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('Grand Total:', summaryX, doc.y + 12, { width: labelWidth, align: 'left' })
            .text(`₹${grandTotal.toFixed(2)}`, summaryX + labelWidth, doc.y - 12, { width: valueWidth, align: 'right' });

        doc.moveDown(3);
    }

    /**
     * Add footer with terms and signature
     */
    private addFooter(doc: PDFKit.PDFDocument, data: InvoiceData) {
        // Terms and conditions
        doc
            .fontSize(8)
            .font('Helvetica-Bold')
            .fillColor('#000000')
            .text('Terms & Conditions:', 50, doc.y)
            .font('Helvetica')
            .fontSize(7)
            .text('1. Goods once sold will not be taken back or exchanged.', 50, doc.y + 3)
            .text('2. All disputes are subject to Mumbai jurisdiction only.', 50, doc.y + 2);

        // Signature section (right side)
        if (doc.y < 650) {
            doc
                .fontSize(8)
                .font('Helvetica')
                .text('For Steal the Deal', 400, doc.y - 40, { align: 'right' })
                .moveDown(2)
                .text('Authorized Signatory', 400, doc.y, { align: 'right' });
        }

        // Bottom footer
        doc
            .fontSize(7)
            .font('Helvetica')
            .fillColor('#666666')
            .text(
                'This is a computer-generated invoice and does not require a physical signature.',
                50,
                750,
                { align: 'center', width: 495 }
            )
            .text(
                'Thank you for shopping with us! For support, contact: support@stealthedeal.com',
                50,
                760,
                { align: 'center', width: 495 }
            );
    }
}

export const invoiceService = new InvoiceService();
