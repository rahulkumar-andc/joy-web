/**
 * Guest Checkout Service
 * 
 * Handles guest checkout flow including:
 * - Session-based cart management
 * - Cart-to-user migration on login
 * 
 * Note: Full guest orders require schema changes (nullable userId).
 * This service focuses on guest cart management and migration.
 */

import { db } from "../db";
import { cartItems, products } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { logger } from "../logger";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// TYPES
// ============================================================================

export interface GuestCheckoutData {
    email: string;
    name: string;
    phone?: string;
    shippingAddress: {
        fullName: string;
        address: string;
        city: string;
        zipCode: string;
        country: string;
    };
}

export interface GuestCartItem {
    productId: number;
    quantity: number;
    size?: string;
    color?: string;
}

// ============================================================================
// GUEST SESSION MANAGEMENT
// ============================================================================

/**
 * Generate a unique session ID for guest users
 */
export function generateGuestSessionId(): string {
    return `guest_${uuidv4()}`;
}

/**
 * Get guest cart items by session ID
 */
export async function getGuestCart(sessionId: string) {
    try {
        const items = await db
            .select({
                id: cartItems.id,
                productId: cartItems.productId,
                quantity: cartItems.quantity,
                size: cartItems.size,
                color: cartItems.color,
                product: {
                    id: products.id,
                    name: products.name,
                    price: products.price,
                    discountPrice: products.discountPrice,
                    images: products.images,
                    stockQuantity: products.stockQuantity,
                }
            })
            .from(cartItems)
            .innerJoin(products, eq(cartItems.productId, products.id))
            .where(eq(cartItems.sessionId, sessionId));

        return items;
    } catch (error) {
        logger.error("Error fetching guest cart:", error);
        return [];
    }
}

/**
 * Add item to guest cart
 */
export async function addToGuestCart(
    sessionId: string,
    item: GuestCartItem
): Promise<{ success: boolean; cartItemId?: number; error?: string }> {
    try {
        // Check if item already exists in cart
        const existing = await db
            .select()
            .from(cartItems)
            .where(and(
                eq(cartItems.sessionId, sessionId),
                eq(cartItems.productId, item.productId),
                item.size ? eq(cartItems.size, item.size) : isNull(cartItems.size),
                item.color ? eq(cartItems.color, item.color) : isNull(cartItems.color)
            ))
            .limit(1);

        if (existing.length > 0) {
            // Update quantity
            const [updated] = await db
                .update(cartItems)
                .set({
                    quantity: existing[0].quantity + item.quantity,
                    updatedAt: new Date()
                })
                .where(eq(cartItems.id, existing[0].id))
                .returning();

            return { success: true, cartItemId: updated.id };
        }

        // Insert new item
        const [inserted] = await db
            .insert(cartItems)
            .values({
                sessionId,
                productId: item.productId,
                quantity: item.quantity,
                size: item.size,
                color: item.color,
                updatedAt: new Date()
            })
            .returning();

        return { success: true, cartItemId: inserted.id };
    } catch (error) {
        logger.error("Error adding to guest cart:", error);
        return { success: false, error: "Failed to add item to cart" };
    }
}

/**
 * Update guest cart item quantity
 */
export async function updateGuestCartItem(
    sessionId: string,
    cartItemId: number,
    quantity: number
): Promise<boolean> {
    try {
        if (quantity <= 0) {
            // Remove item
            await db
                .delete(cartItems)
                .where(and(
                    eq(cartItems.id, cartItemId),
                    eq(cartItems.sessionId, sessionId)
                ));
        } else {
            await db
                .update(cartItems)
                .set({ quantity, updatedAt: new Date() })
                .where(and(
                    eq(cartItems.id, cartItemId),
                    eq(cartItems.sessionId, sessionId)
                ));
        }
        return true;
    } catch (error) {
        logger.error("Error updating guest cart:", error);
        return false;
    }
}

/**
 * Clear guest cart
 */
export async function clearGuestCart(sessionId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
}

// ============================================================================
// CART MIGRATION (Guest to User)
// ============================================================================

/**
 * Migrate guest cart to user cart on login/registration
 */
export async function migrateGuestCartToUser(
    sessionId: string,
    userId: number
): Promise<{ migrated: number; merged: number }> {
    let migrated = 0;
    let merged = 0;

    try {
        // Get guest cart items
        const guestItems = await db
            .select()
            .from(cartItems)
            .where(eq(cartItems.sessionId, sessionId));

        for (const guestItem of guestItems) {
            // Check if user already has this item
            const userItem = await db
                .select()
                .from(cartItems)
                .where(and(
                    eq(cartItems.userId, userId),
                    eq(cartItems.productId, guestItem.productId),
                    guestItem.size ? eq(cartItems.size, guestItem.size) : isNull(cartItems.size),
                    guestItem.color ? eq(cartItems.color, guestItem.color) : isNull(cartItems.color)
                ))
                .limit(1);

            if (userItem.length > 0) {
                // Merge: add quantities
                await db
                    .update(cartItems)
                    .set({
                        quantity: userItem[0].quantity + guestItem.quantity,
                        updatedAt: new Date()
                    })
                    .where(eq(cartItems.id, userItem[0].id));

                // Delete guest item
                await db.delete(cartItems).where(eq(cartItems.id, guestItem.id));
                merged++;
            } else {
                // Migrate: transfer ownership
                await db
                    .update(cartItems)
                    .set({
                        userId,
                        sessionId: null,
                        updatedAt: new Date()
                    })
                    .where(eq(cartItems.id, guestItem.id));
                migrated++;
            }
        }

        logger.info(`Cart migration: ${migrated} migrated, ${merged} merged for user ${userId}`);
    } catch (error) {
        logger.error("Cart migration error:", error);
    }

    return { migrated, merged };
}

/**
 * Get cart summary for guest session
 */
export async function getGuestCartSummary(sessionId: string): Promise<{
    itemCount: number;
    subtotal: number;
    shipping: number;
    total: number;
}> {
    const items = await getGuestCart(sessionId);

    let subtotal = 0;
    let itemCount = 0;

    for (const item of items) {
        const price = item.product.discountPrice
            ? parseFloat(item.product.discountPrice)
            : parseFloat(item.product.price);
        subtotal += price * item.quantity;
        itemCount += item.quantity;
    }

    const shipping = subtotal > 2000 ? 0 : 100;

    return {
        itemCount,
        subtotal,
        shipping,
        total: subtotal + shipping
    };
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const guestCheckoutService = {
    generateSessionId: generateGuestSessionId,
    getCart: getGuestCart,
    addToCart: addToGuestCart,
    updateCartItem: updateGuestCartItem,
    clearCart: clearGuestCart,
    migrateCartToUser: migrateGuestCartToUser,
    getCartSummary: getGuestCartSummary
};
