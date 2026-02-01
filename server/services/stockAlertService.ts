/**
 * Stock Alert Service
 * 
 * Monitors inventory levels and sends alerts to admins when stock is low.
 * Maintains an audit log of all stock changes.
 */

import { db } from '../db';
import { products, type Product } from '@shared/schema';
import { eq, lt, sql } from 'drizzle-orm';
import { logger } from '../logger';

interface StockAlert {
    productId: number;
    productName: string;
    currentStock: number;
    threshold: number;
    severity: 'low' | 'critical' | 'out_of_stock';
}

interface StockChange {
    productId: number;
    previousStock: number;
    newStock: number;
    changeAmount: number;
    reason: 'sale' | 'restock' | 'reservation' | 'cancellation' | 'adjustment';
    userId?: number;
    orderId?: number;
    timestamp: Date;
}

export class StockAlertService {
    // Thresholds for alerts
    private static readonly LOW_STOCK_THRESHOLD = 10;
    private static readonly CRITICAL_STOCK_THRESHOLD = 5;

    /**
     * Check all products for low stock and return alerts
     */
    static async checkLowStock(): Promise<StockAlert[]> {
        const alerts: StockAlert[] = [];

        const lowStockProducts = await db
            .select()
            .from(products)
            .where(lt(products.stockQuantity, this.LOW_STOCK_THRESHOLD));

        for (const product of lowStockProducts) {
            const severity = this.getStockSeverity(product.stockQuantity);

            alerts.push({
                productId: product.id,
                productName: product.name,
                currentStock: product.stockQuantity,
                threshold: this.LOW_STOCK_THRESHOLD,
                severity
            });
        }

        return alerts;
    }

    /**
     * Get severity level based on stock quantity
     */
    private static getStockSeverity(stock: number): 'low' | 'critical' | 'out_of_stock' {
        if (stock === 0) return 'out_of_stock';
        if (stock <= this.CRITICAL_STOCK_THRESHOLD) return 'critical';
        return 'low';
    }

    /**
     * Send alert to admins (email, webhook, etc.)
     */
    static async sendStockAlert(alert: StockAlert): Promise<void> {
        logger.warn('Low stock alert', alert);

        // TODO: Implement email notification to admins
        // await emailService.send({
        //     to: 'admin@example.com',
        //     subject: `Stock Alert: ${alert.productName} is ${alert.severity}`,
        //     body: `Product ${alert.productName} (ID: ${alert.productId}) has only ${alert.currentStock} units remaining.`
        // });

        // For now, just log
        console.warn(`🚨 STOCK ALERT [${alert.severity.toUpperCase()}]: ${alert.productName} - ${alert.currentStock} units remaining`);
    }

    /**
     * Log stock change to audit trail
     */
    static async logStockChange(change: StockChange): Promise<void> {
        logger.info('Stock change logged', change);

        // Store in database (would need a stock_audit_log table)
        // For now, just log to console and file
        const logEntry = {
            timestamp: change.timestamp.toISOString(),
            productId: change.productId,
            change: `${change.previousStock} → ${change.newStock} (${change.changeAmount > 0 ? '+' : ''}${change.changeAmount})`,
            reason: change.reason,
            userId: change.userId,
            orderId: change.orderId
        };

        console.log('📦 Stock Change:', JSON.stringify(logEntry));

        // Check if alert needed after change
        if (change.newStock <= this.LOW_STOCK_THRESHOLD) {
            const product = await db
                .select()
                .from(products)
                .where(eq(products.id, change.productId))
                .limit(1);

            if (product.length > 0) {
                await this.sendStockAlert({
                    productId: change.productId,
                    productName: product[0].name,
                    currentStock: change.newStock,
                    threshold: this.LOW_STOCK_THRESHOLD,
                    severity: this.getStockSeverity(change.newStock)
                });
            }
        }
    }

    /**
     * Get product stock level with alert status
     */
    static async getProductStockStatus(productId: number): Promise<{
        stock: number;
        status: 'ok' | 'low' | 'critical' | 'out_of_stock';
        needsAlert: boolean;
    }> {
        const [product] = await db
            .select({ stockQuantity: products.stockQuantity })
            .from(products)
            .where(eq(products.id, productId));

        if (!product) {
            throw new Error(`Product ${productId} not found`);
        }

        const stock = product.stockQuantity;
        let status: 'ok' | 'low' | 'critical' | 'out_of_stock';

        if (stock === 0) {
            status = 'out_of_stock';
        } else if (stock <= this.CRITICAL_STOCK_THRESHOLD) {
            status = 'critical';
        } else if (stock <= this.LOW_STOCK_THRESHOLD) {
            status = 'low';
        } else {
            status = 'ok';
        }

        return {
            stock,
            status,
            needsAlert: status !== 'ok'
        };
    }

    /**
     * Run periodic stock check (cron job)
     */
    static async runStockCheck(): Promise<void> {
        logger.info('Running periodic stock check...');

        const alerts = await this.checkLowStock();

        if (alerts.length > 0) {
            logger.warn(`Found ${alerts.length} products with low stock`);

            for (const alert of alerts) {
                await this.sendStockAlert(alert);
            }
        } else {
            logger.info('All products have sufficient stock');
        }
    }
}

export const stockAlertService = StockAlertService;
