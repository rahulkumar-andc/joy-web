import { Router, Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { invoiceService } from '../services/invoiceService';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { orders } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { AppError } from '../utils/AppError';
import { logger } from '../logger';

const router = Router();

/**
 * GET /api/orders/:id/invoice
 * Download PDF invoice for an order
 * 
 * Authorization: User must own the order OR be an admin
 */
router.get(
    '/:id/invoice',
    requireAuth,
    catchAsync(async (req: Request, res: Response) => {
        const orderId = parseInt(req.params.id);
        const userId = (req.user as any).id;
        const userRole = (req.user as any).role;

        if (isNaN(orderId)) {
            throw new AppError('Invalid order ID', 400);
        }

        // Get order to verify ownership
        const [order] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId));

        if (!order) {
            throw new AppError('Order not found', 404);
        }

        // Check authorization: must be order owner OR admin
        const isAdmin = userRole === 'admin' || userRole === 'superadmin';
        const isOwner = order.userId === userId;

        if (!isOwner && !isAdmin) {
            logger.warn('Unauthorized invoice access attempt', {
                orderId,
                userId,
                orderUserId: order.userId
            });
            throw new AppError('You are not authorized to access this invoice', 403);
        }

        // Check if order is in a state where invoice can be generated
        // Typically only for paid/delivered orders
        if (order.paymentStatus !== 'paid' && !order.codAmount) {
            throw new AppError('Invoice not available for unpaid orders', 400);
        }

        logger.info('Generating invoice', {
            orderId,
            userId,
            isAdmin
        });

        // Generate PDF invoice
        const pdfBuffer = await invoiceService.generateInvoice(orderId);

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${orderId}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        // Send PDF
        res.send(pdfBuffer);

        logger.info('Invoice downloaded successfully', {
            orderId,
            userId,
            pdfSize: pdfBuffer.length
        });
    })
);

export default router;
