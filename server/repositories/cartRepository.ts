import { db } from "../db";
import { cartItems, products, type CartItem, type Product } from "@shared/schema";
import { eq, and } from "drizzle-orm";

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
