import { db } from "../../db";
import { eq, and, desc, sql, like, or } from "drizzle-orm";
import { products, Product, InsertProduct, categories } from "@shared/schema";
import { sellerProfiles, sellerNotifications } from "@shared/seller-schema";

// ============================================================================
// SELLER PRODUCT SERVICE
// Handles seller product CRUD with moderation workflow
// ============================================================================

class SellerProductService {
    /**
     * Create a product (seller)
     * Product goes to PENDING status for admin review
     */
    async createProduct(
        sellerId: number,
        data: Omit<InsertProduct, "sellerId" | "moderationStatus" | "createdAt">
    ): Promise<{ success: boolean; product?: Product; error?: string }> {
        try {
            // Get seller profile to get userId
            const seller = await db.query.sellerProfiles.findFirst({
                where: eq(sellerProfiles.id, sellerId),
            });

            if (!seller) {
                return { success: false, error: "Seller not found" };
            }

            if (seller.status !== "approved") {
                return { success: false, error: "Seller account is not approved" };
            }

            // Validate category exists
            if (data.categoryId) {
                const category = await db.query.categories.findFirst({
                    where: eq(categories.id, data.categoryId),
                });
                if (!category) {
                    return { success: false, error: "Category not found" };
                }
            }

            // Create product in pending status
            const [product] = await db
                .insert(products)
                .values({
                    ...data,
                    sellerId: seller.userId, // Use userId for backward compatibility
                    moderationStatus: "pending", // Always pending for new seller products
                })
                .returning();

            // Update seller's product count
            await db
                .update(sellerProfiles)
                .set({
                    totalProducts: sql`${sellerProfiles.totalProducts} + 1`,
                    updatedAt: new Date(),
                })
                .where(eq(sellerProfiles.id, sellerId));

            return { success: true, product };
        } catch (error) {
            console.error("[SellerProduct] Create error:", error);
            return { success: false, error: "Failed to create product" };
        }
    }

    /**
     * Update a product (seller)
     * Significant changes may trigger re-moderation
     */
    async updateProduct(
        sellerId: number,
        productId: number,
        data: Partial<InsertProduct>,
        requiresReModeration: boolean = false
    ): Promise<{ success: boolean; product?: Product; error?: string }> {
        try {
            // Get seller profile
            const seller = await db.query.sellerProfiles.findFirst({
                where: eq(sellerProfiles.id, sellerId),
            });

            if (!seller) {
                return { success: false, error: "Seller not found" };
            }

            // Check product ownership
            const product = await db.query.products.findFirst({
                where: and(
                    eq(products.id, productId),
                    eq(products.sellerId, seller.userId)
                ),
            });

            if (!product) {
                return { success: false, error: "Product not found or not owned by seller" };
            }

            // Remove fields that seller cannot update
            delete (data as any).sellerId;
            delete (data as any).moderatedBy;
            delete (data as any).moderatedAt;

            // If significant change, reset to pending
            if (requiresReModeration && product.moderationStatus === "approved") {
                (data as any).moderationStatus = "pending";
                (data as any).rejectionReason = null;
            }

            const [updated] = await db
                .update(products)
                .set(data)
                .where(eq(products.id, productId))
                .returning();

            return { success: true, product: updated };
        } catch (error) {
            console.error("[SellerProduct] Update error:", error);
            return { success: false, error: "Failed to update product" };
        }
    }

    /**
     * Delete/disable a product (seller)
     * Instead of hard delete, we set status to disabled
     */
    async deleteProduct(
        sellerId: number,
        productId: number
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const seller = await db.query.sellerProfiles.findFirst({
                where: eq(sellerProfiles.id, sellerId),
            });

            if (!seller) {
                return { success: false, error: "Seller not found" };
            }

            // Check product ownership
            const product = await db.query.products.findFirst({
                where: and(
                    eq(products.id, productId),
                    eq(products.sellerId, seller.userId)
                ),
            });

            if (!product) {
                return { success: false, error: "Product not found or not owned by seller" };
            }

            // Soft delete by setting status to disabled
            await db
                .update(products)
                .set({
                    moderationStatus: "disabled",
                })
                .where(eq(products.id, productId));

            // Update seller's product count
            await db
                .update(sellerProfiles)
                .set({
                    totalProducts: sql`GREATEST(${sellerProfiles.totalProducts} - 1, 0)`,
                    updatedAt: new Date(),
                })
                .where(eq(sellerProfiles.id, sellerId));

            return { success: true };
        } catch (error) {
            console.error("[SellerProduct] Delete error:", error);
            return { success: false, error: "Failed to delete product" };
        }
    }

    /**
     * Get seller's products
     */
    async getSellerProducts(
        sellerId: number,
        filters?: {
            status?: Product["moderationStatus"];
            search?: string;
            categoryId?: number;
        },
        page: number = 1,
        limit: number = 20
    ): Promise<{ products: Product[]; total: number }> {
        const offset = (page - 1) * limit;

        const seller = await db.query.sellerProfiles.findFirst({
            where: eq(sellerProfiles.id, sellerId),
        });

        if (!seller) {
            return { products: [], total: 0 };
        }

        let whereConditions: any[] = [eq(products.sellerId, seller.userId)];

        if (filters?.status) {
            whereConditions.push(eq(products.moderationStatus, filters.status));
        }

        if (filters?.categoryId) {
            whereConditions.push(eq(products.categoryId, filters.categoryId));
        }

        if (filters?.search) {
            whereConditions.push(
                or(
                    like(products.name, `%${filters.search}%`),
                    like(products.description, `%${filters.search}%`),
                    like(products.sku || "", `%${filters.search}%`)
                )
            );
        }

        const productsList = await db.query.products.findMany({
            where: and(...whereConditions),
            with: {
                category: true,
            },
            orderBy: [desc(products.createdAt)],
            limit,
            offset,
        });

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .where(and(...whereConditions));

        return { products: productsList, total: Number(count) };
    }

    /**
     * Get product by ID with ownership check
     */
    async getSellerProductById(
        sellerId: number,
        productId: number
    ): Promise<Product | null> {
        const seller = await db.query.sellerProfiles.findFirst({
            where: eq(sellerProfiles.id, sellerId),
        });

        if (!seller) {
            return null;
        }

        const product = await db.query.products.findFirst({
            where: and(
                eq(products.id, productId),
                eq(products.sellerId, seller.userId)
            ),
            with: {
                category: true,
            },
        });

        return product || null;
    }

    /**
     * Update stock quantity
     */
    async updateStock(
        sellerId: number,
        productId: number,
        quantity: number,
        operation: "set" | "add" | "subtract"
    ): Promise<{ success: boolean; newStock?: number; error?: string }> {
        try {
            const product = await this.getSellerProductById(sellerId, productId);

            if (!product) {
                return { success: false, error: "Product not found" };
            }

            let newStock: number;

            switch (operation) {
                case "set":
                    newStock = quantity;
                    break;
                case "add":
                    newStock = product.stockQuantity + quantity;
                    break;
                case "subtract":
                    newStock = Math.max(0, product.stockQuantity - quantity);
                    break;
                default:
                    return { success: false, error: "Invalid operation" };
            }

            await db
                .update(products)
                .set({ stockQuantity: newStock })
                .where(eq(products.id, productId));

            // Check for low stock notification
            if (newStock <= 5 && product.stockQuantity > 5) {
                await this.sendLowStockNotification(sellerId, product);
            }

            return { success: true, newStock };
        } catch (error) {
            console.error("[SellerProduct] Update stock error:", error);
            return { success: false, error: "Failed to update stock" };
        }
    }

    /**
     * Admin: Get products pending moderation
     */
    async getPendingProducts(
        page: number = 1,
        limit: number = 20
    ): Promise<{ products: Product[]; total: number }> {
        const offset = (page - 1) * limit;

        const productsList = await db.query.products.findMany({
            where: eq(products.moderationStatus, "pending"),
            with: {
                category: true,
            },
            orderBy: [desc(products.createdAt)],
            limit,
            offset,
        });

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .where(eq(products.moderationStatus, "pending"));

        return { products: productsList, total: Number(count) };
    }

    /**
     * Admin: Approve product
     */
    async approveProduct(
        productId: number,
        adminId: number
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const product = await db.query.products.findFirst({
                where: eq(products.id, productId),
            });

            if (!product) {
                return { success: false, error: "Product not found" };
            }

            if (product.moderationStatus !== "pending") {
                return { success: false, error: "Product is not pending moderation" };
            }

            await db
                .update(products)
                .set({
                    moderationStatus: "approved",
                    moderatedBy: adminId,
                    moderatedAt: new Date(),
                    rejectionReason: null,
                })
                .where(eq(products.id, productId));

            // Send notification to seller
            if (product.sellerId) {
                const seller = await db.query.sellerProfiles.findFirst({
                    where: eq(sellerProfiles.userId, product.sellerId),
                });

                if (seller) {
                    await db.insert(sellerNotifications).values({
                        sellerId: seller.id,
                        type: "product_approved",
                        title: "Product Approved",
                        message: `Your product "${product.name}" has been approved and is now live.`,
                        data: { productId: product.id },
                    });
                }
            }

            return { success: true };
        } catch (error) {
            console.error("[SellerProduct] Approve error:", error);
            return { success: false, error: "Failed to approve product" };
        }
    }

    /**
     * Admin: Reject product
     */
    async rejectProduct(
        productId: number,
        adminId: number,
        reason: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const product = await db.query.products.findFirst({
                where: eq(products.id, productId),
            });

            if (!product) {
                return { success: false, error: "Product not found" };
            }

            if (product.moderationStatus !== "pending") {
                return { success: false, error: "Product is not pending moderation" };
            }

            await db
                .update(products)
                .set({
                    moderationStatus: "rejected",
                    moderatedBy: adminId,
                    moderatedAt: new Date(),
                    rejectionReason: reason,
                })
                .where(eq(products.id, productId));

            // Send notification to seller
            if (product.sellerId) {
                const seller = await db.query.sellerProfiles.findFirst({
                    where: eq(sellerProfiles.userId, product.sellerId),
                });

                if (seller) {
                    await db.insert(sellerNotifications).values({
                        sellerId: seller.id,
                        type: "product_rejected",
                        title: "Product Rejected",
                        message: `Your product "${product.name}" has been rejected. Reason: ${reason}`,
                        data: { productId: product.id, reason },
                    });
                }
            }

            return { success: true };
        } catch (error) {
            console.error("[SellerProduct] Reject error:", error);
            return { success: false, error: "Failed to reject product" };
        }
    }

    /**
     * Admin: Disable product
     */
    async disableProduct(
        productId: number,
        adminId: number,
        reason: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            await db
                .update(products)
                .set({
                    moderationStatus: "disabled",
                    moderatedBy: adminId,
                    moderatedAt: new Date(),
                    rejectionReason: reason,
                })
                .where(eq(products.id, productId));

            return { success: true };
        } catch (error) {
            console.error("[SellerProduct] Disable error:", error);
            return { success: false, error: "Failed to disable product" };
        }
    }

    /**
     * Get product statistics for seller
     */
    async getProductStats(sellerId: number): Promise<{
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        disabled: number;
        lowStock: number;
        outOfStock: number;
    }> {
        const seller = await db.query.sellerProfiles.findFirst({
            where: eq(sellerProfiles.id, sellerId),
        });

        if (!seller) {
            return {
                total: 0,
                pending: 0,
                approved: 0,
                rejected: 0,
                disabled: 0,
                lowStock: 0,
                outOfStock: 0,
            };
        }

        const stats = await db
            .select({
                status: products.moderationStatus,
                count: sql<number>`count(*)`,
            })
            .from(products)
            .where(eq(products.sellerId, seller.userId))
            .groupBy(products.moderationStatus);

        const stockStats = await db
            .select({
                lowStock: sql<number>`count(*) filter (where stock_quantity > 0 and stock_quantity <= 5)`,
                outOfStock: sql<number>`count(*) filter (where stock_quantity = 0)`,
            })
            .from(products)
            .where(eq(products.sellerId, seller.userId));

        const result = {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            disabled: 0,
            lowStock: Number(stockStats[0]?.lowStock) || 0,
            outOfStock: Number(stockStats[0]?.outOfStock) || 0,
        };

        for (const row of stats) {
            const count = Number(row.count);
            result.total += count;

            switch (row.status) {
                case "pending":
                    result.pending = count;
                    break;
                case "approved":
                    result.approved = count;
                    break;
                case "rejected":
                    result.rejected = count;
                    break;
                case "disabled":
                    result.disabled = count;
                    break;
            }
        }

        return result;
    }

    /**
     * Send low stock notification
     */
    private async sendLowStockNotification(
        sellerId: number,
        product: Product
    ): Promise<void> {
        try {
            await db.insert(sellerNotifications).values({
                sellerId,
                type: "low_stock",
                title: "Low Stock Alert",
                message: `Product "${product.name}" has only ${product.stockQuantity} items left.`,
                data: { productId: product.id, stock: product.stockQuantity },
            });
        } catch (error) {
            console.error("[SellerProduct] Low stock notification error:", error);
        }
    }
}

export const sellerProductService = new SellerProductService();
