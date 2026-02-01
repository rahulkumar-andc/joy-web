import { db } from "../db";
import { wishlistItems, products, type WishlistItem, type Product } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export class WishlistRepository {
    async getWishlist(userId: number): Promise<(WishlistItem & { product: Product })[]> {
        const items = await db.select({
            wishlistItem: wishlistItems,
            product: products
        })
            .from(wishlistItems)
            .innerJoin(products, eq(wishlistItems.productId, products.id))
            .where(eq(wishlistItems.userId, userId));

        return items.map(i => ({ ...i.wishlistItem, product: i.product }));
    }

    async addToWishlist(userId: number, productId: number): Promise<WishlistItem> {
        // Check if already exists
        const [existing] = await db.select().from(wishlistItems)
            .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
        if (existing) return existing;

        const [item] = await db.insert(wishlistItems).values({ userId, productId }).returning();
        return item;
    }

    async removeFromWishlist(userId: number, productId: number): Promise<void> {
        await db.delete(wishlistItems)
            .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
    }

    async isInWishlist(userId: number, productId: number): Promise<boolean> {
        const [item] = await db.select().from(wishlistItems)
            .where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
        return !!item;
    }
}

export const wishlistRepository = new WishlistRepository();
