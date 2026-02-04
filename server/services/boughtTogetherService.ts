import { db } from "../db";
import { orderItemPairs, products, orderItems, orders } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

/**
 * Service for tracking and retrieving products frequently bought together
 */
export class BoughtTogetherService {
    /**
     * Track products bought together when an order is completed
     */
    async trackOrderPairs(orderId: number): Promise<void> {
        const items = await db.select({ productId: orderItems.productId })
            .from(orderItems)
            .where(eq(orderItems.orderId, orderId));

        if (items.length < 2) return;

        // Generate pairs from all items in the order
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const pid1 = Math.min(items[i].productId, items[j].productId);
                const pid2 = Math.max(items[i].productId, items[j].productId);

                // Upsert: increment count if exists, else insert
                await db.insert(orderItemPairs)
                    .values({ productId1: pid1, productId2: pid2, count: 1 })
                    .onConflictDoUpdate({
                        target: [orderItemPairs.productId1, orderItemPairs.productId2],
                        set: { count: sql`${orderItemPairs.count} + 1` }
                    });
            }
        }
    }

    /**
     * Get products frequently bought together with a given product
     */
    async getBoughtTogether(productId: number, limit: number = 4): Promise<{
        id: number;
        name: string;
        mrp: string;
        salePrice: string | null;
        images: string[];
    }[]> {
        // Find pairs where this product is either productId1 or productId2
        const pairs = await db.select({
            pairedProductId: sql<number>`
                CASE 
                    WHEN ${orderItemPairs.productId1} = ${productId} THEN ${orderItemPairs.productId2}
                    ELSE ${orderItemPairs.productId1}
                END
            `.as('paired_product_id'),
            count: orderItemPairs.count
        })
            .from(orderItemPairs)
            .where(sql`${orderItemPairs.productId1} = ${productId} OR ${orderItemPairs.productId2} = ${productId}`)
            .orderBy(desc(orderItemPairs.count))
            .limit(limit);

        if (pairs.length === 0) {
            // Fallback: return products from same category
            const [product] = await db.select({ categoryId: products.categoryId })
                .from(products)
                .where(eq(products.id, productId));

            if (!product?.categoryId) return [];

            const related = await db.select({
                id: products.id,
                name: products.name,
                mrp: products.mrp,
                salePrice: products.salePrice,
                images: products.images
            })
                .from(products)
                .where(and(
                    eq(products.categoryId, product.categoryId),
                    sql`${products.id} != ${productId}`
                ))
                .limit(limit);

            return related;
        }

        // Fetch product details for paired products
        const productIds = pairs.map(p => p.pairedProductId);
        const pairedProducts = await db.select({
            id: products.id,
            name: products.name,
            mrp: products.mrp,
            salePrice: products.salePrice,
            images: products.images
        })
            .from(products)
            .where(sql`${products.id} IN ${productIds}`);

        return pairedProducts;
    }
}

export const boughtTogetherService = new BoughtTogetherService();
