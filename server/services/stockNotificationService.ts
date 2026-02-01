/**
 * Product Availability Notification Service
 * 
 * Allows users to sign up for notifications when out-of-stock products
 * become available again.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "../logger";
import { emailService } from "./email";

// ============================================================================
// STOCK NOTIFICATION TABLE (Add to schema if not exists)
// ============================================================================

// For now, we'll store in a simple structure
// In production, add this to shared/schema.ts:
// export const stockNotifications = pgTable("stock_notifications", {
//   id: serial("id").primaryKey(),
//   productId: integer("product_id").references(() => products.id).notNull(),
//   email: text("email").notNull(),
//   userId: integer("user_id").references(() => users.id),
//   notifiedAt: timestamp("notified_at"),
//   createdAt: timestamp("created_at").defaultNow(),
// });

interface StockNotificationData {
    productId: number;
    email: string;
    userId?: number;
}

// In-memory store for demo (use database in production)
const stockNotifications = new Map<number, StockNotificationData[]>();

// ============================================================================
// NOTIFICATION MANAGEMENT
// ============================================================================

/**
 * Subscribe to stock notification for a product
 */
export async function subscribeToStockNotification(
    productId: number,
    email: string,
    userId?: number
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get current subscribers for this product
        const subscribers = stockNotifications.get(productId) || [];

        // Check if already subscribed
        const existing = subscribers.find(s => s.email === email);
        if (existing) {
            return { success: false, error: "Already subscribed" };
        }

        // Add subscription
        subscribers.push({ productId, email, userId });
        stockNotifications.set(productId, subscribers);

        logger.info(`Stock notification subscribed: ${email} for product ${productId}`);

        return { success: true };
    } catch (error) {
        logger.error("Error subscribing to stock notification:", error);
        return { success: false, error: "Failed to subscribe" };
    }
}

/**
 * Unsubscribe from stock notification
 */
export async function unsubscribeFromStockNotification(
    productId: number,
    email: string
): Promise<boolean> {
    try {
        const subscribers = stockNotifications.get(productId) || [];
        const filtered = subscribers.filter(s => s.email !== email);

        if (filtered.length !== subscribers.length) {
            stockNotifications.set(productId, filtered);
            logger.info(`Stock notification unsubscribed: ${email} for product ${productId}`);
            return true;
        }

        return false;
    } catch (error) {
        logger.error("Error unsubscribing from stock notification:", error);
        return false;
    }
}

/**
 * Notify subscribers when product is back in stock
 */
export async function notifyStockAvailable(
    productId: number,
    productName: string,
    productUrl: string
): Promise<{ notified: number }> {
    const subscribers = stockNotifications.get(productId) || [];

    if (subscribers.length === 0) {
        return { notified: 0 };
    }

    let notified = 0;

    for (const subscriber of subscribers) {
        try {
            await emailService.sendStockNotification(
                subscriber.email,
                productName,
                productUrl
            );
            notified++;
            logger.info(`Stock notification sent to ${subscriber.email} for product ${productId}`);
        } catch (error) {
            logger.error(`Failed to send stock notification to ${subscriber.email}:`, error);
        }
    }

    // Clear subscribers after notifying
    stockNotifications.delete(productId);

    logger.info(`Stock notifications sent: ${notified} users for product ${productId}`);

    return { notified };
}

/**
 * Get subscription count for a product
 */
export function getSubscriberCount(productId: number): number {
    return (stockNotifications.get(productId) || []).length;
}

/**
 * Check if user is subscribed to a product notification
 */
export function isSubscribed(productId: number, email: string): boolean {
    const subscribers = stockNotifications.get(productId) || [];
    return subscribers.some(s => s.email === email);
}

// ============================================================================
// STOCK CHECK INTEGRATION
// ============================================================================

/**
 * Should be called whenever product stock changes
 * Typically integrated with product update endpoint or stock management
 */
export async function onStockUpdated(
    productId: number,
    previousStock: number,
    newStock: number,
    productName: string,
    productSlug: string
): Promise<void> {
    // If product just came back in stock
    if (previousStock <= 0 && newStock > 0) {
        const baseUrl = process.env.BASE_URL || "http://localhost:5000";
        const productUrl = `${baseUrl}/products/${productSlug}`;

        await notifyStockAvailable(productId, productName, productUrl);
    }
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const stockNotificationService = {
    subscribe: subscribeToStockNotification,
    unsubscribe: unsubscribeFromStockNotification,
    notifyAvailable: notifyStockAvailable,
    getSubscriberCount,
    isSubscribed,
    onStockUpdated
};
