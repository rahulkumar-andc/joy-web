import { db } from "../db";
import { cartItems, products, type CartItem, type Product } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export class CartRepository {
    async getCart(userId?: number, sessionId?: string): Promise<(CartItem & { product: Product })[]> {
        let whereClause;
        if (userId) whereClause = eq(cartItems.userId, userId);
        else if (sessionId) whereClause = eq(cartItems.sessionId, sessionId);
        else return [];

        const items = await db.select({
            cartItem: cartItems,
            product: products
        })
            .from(cartItems)
            .innerJoin(products, eq(cartItems.productId, products.id))
            .where(whereClause);

        return items.map(i => ({ ...i.cartItem, product: i.product }));
    }

    async addToCart(item: Omit<CartItem, "id" | "updatedAt">): Promise<CartItem> {
        // Check if same product (with same size/color) exists for this user/session
        const conditions = [
            eq(cartItems.productId, item.productId),
        ];

        // User-based or session-based cart
        if (item.userId) {
            conditions.push(eq(cartItems.userId, item.userId));
        } else if (item.sessionId) {
            conditions.push(eq(cartItems.sessionId, item.sessionId));
        }

        // Match size and color (null-safe comparison)
        if (item.size) {
            conditions.push(eq(cartItems.size, item.size));
        } else {
            conditions.push(sql`${cartItems.size} IS NULL`);
        }

        if (item.color) {
            conditions.push(eq(cartItems.color, item.color));
        } else {
            conditions.push(sql`${cartItems.color} IS NULL`);
        }

        const existing = await db.select().from(cartItems).where(and(...conditions)).limit(1);

        if (existing.length > 0) {
            // Update quantity instead of inserting duplicate
            const [updated] = await db.update(cartItems)
                .set({
                    quantity: existing[0].quantity + (item.quantity || 1),
                    updatedAt: new Date()
                })
                .where(eq(cartItems.id, existing[0].id))
                .returning();
            return updated;
        }

        // New item - insert
        const [newItem] = await db.insert(cartItems).values(item).returning();
        return newItem;
    }

    async updateCartItem(id: number, quantity: number): Promise<CartItem | undefined> {
        const [updated] = await db.update(cartItems)
            .set({
                quantity,
                updatedAt: new Date() // Explicitly update timestamp
            })
            .where(eq(cartItems.id, id))
            .returning();
        return updated;
    }

    async removeFromCart(id: number): Promise<void> {
        await db.delete(cartItems).where(eq(cartItems.id, id));
    }

    async clearCart(userId: number): Promise<void> {
        await db.delete(cartItems).where(eq(cartItems.userId, userId));
    }
}

export const cartRepository = new CartRepository();
