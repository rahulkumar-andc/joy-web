import { db } from "../../db";
import { eq, and, desc, sql, isNull, or, gte, lte } from "drizzle-orm";
import {
    commissionRules,
    CommissionRule,
    InsertCommissionRule,
    DEFAULT_COMMISSION_RATE,
} from "@shared/seller-schema";
import { products, categories } from "@shared/schema";

// ============================================================================
// COMMISSION SERVICE
// Handles commission rule management and calculation
// ============================================================================

class CommissionService {
    /**
     * Calculate commission for a product/seller/amount
     * Priority: Seller-specific > Category-specific > Default
     */
    async calculateCommission(
        productId: number,
        sellerId: number,
        amount: number
    ): Promise<{
        commission: number;
        rate: number;
        ruleId?: number;
        ruleName?: string;
    }> {
        const now = new Date();

        // Get product for category
        const product = await db.query.products.findFirst({
            where: eq(products.id, productId),
        });

        // 1. Check for seller-specific rule (highest priority)
        const sellerRule = await db.query.commissionRules.findFirst({
            where: and(
                eq(commissionRules.sellerId, sellerId),
                eq(commissionRules.isActive, true),
                or(
                    isNull(commissionRules.validFrom),
                    lte(commissionRules.validFrom, now)
                ),
                or(
                    isNull(commissionRules.validUntil),
                    gte(commissionRules.validUntil, now)
                )
            ),
            orderBy: [desc(commissionRules.priority)],
        });

        if (sellerRule) {
            const result = this.applyRule(sellerRule, amount);
            return {
                ...result,
                ruleId: sellerRule.id,
                ruleName: sellerRule.name,
            };
        }

        // 2. Check for category-specific rule
        if (product?.categoryId) {
            const categoryRule = await db.query.commissionRules.findFirst({
                where: and(
                    eq(commissionRules.categoryId, product.categoryId),
                    isNull(commissionRules.sellerId),
                    eq(commissionRules.isActive, true),
                    or(
                        isNull(commissionRules.validFrom),
                        lte(commissionRules.validFrom, now)
                    ),
                    or(
                        isNull(commissionRules.validUntil),
                        gte(commissionRules.validUntil, now)
                    )
                ),
                orderBy: [desc(commissionRules.priority)],
            });

            if (categoryRule) {
                const result = this.applyRule(categoryRule, amount);
                return {
                    ...result,
                    ruleId: categoryRule.id,
                    ruleName: categoryRule.name,
                };
            }
        }

        // 3. Check for default platform rule
        const defaultRule = await db.query.commissionRules.findFirst({
            where: and(
                isNull(commissionRules.categoryId),
                isNull(commissionRules.sellerId),
                eq(commissionRules.isActive, true)
            ),
            orderBy: [desc(commissionRules.priority)],
        });

        if (defaultRule) {
            const result = this.applyRule(defaultRule, amount);
            return {
                ...result,
                ruleId: defaultRule.id,
                ruleName: defaultRule.name,
            };
        }

        // 4. Fallback to hardcoded default
        const defaultRate = Number(DEFAULT_COMMISSION_RATE) / 100;
        return {
            commission: amount * defaultRate,
            rate: Number(DEFAULT_COMMISSION_RATE),
            ruleName: "Platform Default",
        };
    }

    /**
     * Apply a commission rule to an amount
     */
    private applyRule(
        rule: CommissionRule,
        amount: number
    ): { commission: number; rate: number } {
        let commission: number;
        let rate: number;

        if (rule.commissionType === "fixed") {
            commission = Number(rule.commissionValue);
            rate = amount > 0 ? (commission / amount) * 100 : 0;
        } else {
            rate = Number(rule.commissionValue);
            commission = amount * (rate / 100);

            // Apply min/max limits
            if (rule.minCommission && commission < Number(rule.minCommission)) {
                commission = Number(rule.minCommission);
                rate = amount > 0 ? (commission / amount) * 100 : 0;
            }
            if (rule.maxCommission && commission > Number(rule.maxCommission)) {
                commission = Number(rule.maxCommission);
                rate = amount > 0 ? (commission / amount) * 100 : 0;
            }
        }

        return { commission: Math.round(commission * 100) / 100, rate };
    }

    /**
     * Get applicable rule for a product/seller
     */
    async getApplicableRule(
        productId: number,
        sellerId: number
    ): Promise<CommissionRule | null> {
        const { ruleId } = await this.calculateCommission(productId, sellerId, 1000);
        if (!ruleId) return null;

        const rule = await db.query.commissionRules.findFirst({
            where: eq(commissionRules.id, ruleId),
        });

        return rule || null;
    }

    /**
     * Get seller's commission rate (for display)
     */
    async getSellerCommissionRate(sellerId: number): Promise<{
        rate: number;
        type: "percentage" | "fixed";
        ruleName: string;
    }> {
        const now = new Date();

        // Check for seller-specific rule
        const sellerRule = await db.query.commissionRules.findFirst({
            where: and(
                eq(commissionRules.sellerId, sellerId),
                eq(commissionRules.isActive, true),
                or(
                    isNull(commissionRules.validFrom),
                    lte(commissionRules.validFrom, now)
                ),
                or(
                    isNull(commissionRules.validUntil),
                    gte(commissionRules.validUntil, now)
                )
            ),
            orderBy: [desc(commissionRules.priority)],
        });

        if (sellerRule) {
            return {
                rate: Number(sellerRule.commissionValue),
                type: sellerRule.commissionType as "percentage" | "fixed",
                ruleName: sellerRule.name,
            };
        }

        // Return default
        return {
            rate: Number(DEFAULT_COMMISSION_RATE),
            type: "percentage",
            ruleName: "Platform Default",
        };
    }

    /**
     * Admin: Create commission rule
     */
    async createRule(
        data: InsertCommissionRule,
        createdBy: number
    ): Promise<{ success: boolean; rule?: CommissionRule; error?: string }> {
        try {
            // Validate category exists if specified
            if (data.categoryId) {
                const category = await db.query.categories.findFirst({
                    where: eq(categories.id, data.categoryId),
                });
                if (!category) {
                    return { success: false, error: "Category not found" };
                }
            }

            const [rule] = await db
                .insert(commissionRules)
                .values({
                    ...data,
                    createdBy,
                })
                .returning();

            return { success: true, rule };
        } catch (error) {
            console.error("[Commission] Create rule error:", error);
            return { success: false, error: "Failed to create rule" };
        }
    }

    /**
     * Admin: Update commission rule
     */
    async updateRule(
        ruleId: number,
        data: Partial<InsertCommissionRule>
    ): Promise<{ success: boolean; rule?: CommissionRule; error?: string }> {
        try {
            const existing = await db.query.commissionRules.findFirst({
                where: eq(commissionRules.id, ruleId),
            });

            if (!existing) {
                return { success: false, error: "Rule not found" };
            }

            const [rule] = await db
                .update(commissionRules)
                .set({
                    ...data,
                    updatedAt: new Date(),
                })
                .where(eq(commissionRules.id, ruleId))
                .returning();

            return { success: true, rule };
        } catch (error) {
            console.error("[Commission] Update rule error:", error);
            return { success: false, error: "Failed to update rule" };
        }
    }

    /**
     * Admin: Delete commission rule
     */
    async deleteRule(ruleId: number): Promise<{ success: boolean; error?: string }> {
        try {
            const existing = await db.query.commissionRules.findFirst({
                where: eq(commissionRules.id, ruleId),
            });

            if (!existing) {
                return { success: false, error: "Rule not found" };
            }

            // Don't delete default platform rule
            if (!existing.categoryId && !existing.sellerId && existing.name === "Platform Default") {
                return { success: false, error: "Cannot delete default platform rule" };
            }

            await db.delete(commissionRules).where(eq(commissionRules.id, ruleId));

            return { success: true };
        } catch (error) {
            console.error("[Commission] Delete rule error:", error);
            return { success: false, error: "Failed to delete rule" };
        }
    }

    /**
     * Admin: Get all commission rules
     */
    async getAllRules(
        filters?: {
            categoryId?: number;
            sellerId?: number;
            isActive?: boolean;
        },
        page: number = 1,
        limit: number = 50
    ): Promise<{ rules: CommissionRule[]; total: number }> {
        const offset = (page - 1) * limit;

        let whereConditions: any[] = [];

        if (filters?.categoryId !== undefined) {
            if (filters.categoryId === 0) {
                whereConditions.push(isNull(commissionRules.categoryId));
            } else {
                whereConditions.push(eq(commissionRules.categoryId, filters.categoryId));
            }
        }

        if (filters?.sellerId !== undefined) {
            if (filters.sellerId === 0) {
                whereConditions.push(isNull(commissionRules.sellerId));
            } else {
                whereConditions.push(eq(commissionRules.sellerId, filters.sellerId));
            }
        }

        if (filters?.isActive !== undefined) {
            whereConditions.push(eq(commissionRules.isActive, filters.isActive));
        }

        const whereClause = whereConditions.length > 0
            ? and(...whereConditions)
            : undefined;

        const rules = await db.query.commissionRules.findMany({
            where: whereClause,
            with: {
                category: true,
                seller: {
                    columns: {
                        id: true,
                        shopName: true,
                    },
                },
            },
            orderBy: [desc(commissionRules.priority), desc(commissionRules.createdAt)],
            limit,
            offset,
        });

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(commissionRules)
            .where(whereClause);

        return { rules, total: Number(count) };
    }

    /**
     * Admin: Get commission rule by ID
     */
    async getRuleById(ruleId: number): Promise<CommissionRule | null> {
        const rule = await db.query.commissionRules.findFirst({
            where: eq(commissionRules.id, ruleId),
            with: {
                category: true,
                seller: {
                    columns: {
                        id: true,
                        shopName: true,
                    },
                },
            },
        });

        return rule || null;
    }

    /**
     * Get commission breakdown for an order
     * Used for transparency and dispute resolution
     */
    async getOrderCommissionBreakdown(
        items: Array<{ productId: number; sellerId: number; amount: number }>
    ): Promise<
        Array<{
            productId: number;
            sellerId: number;
            amount: number;
            commission: number;
            rate: number;
            ruleName: string;
            sellerEarnings: number;
        }>
    > {
        const breakdown = [];

        for (const item of items) {
            const result = await this.calculateCommission(
                item.productId,
                item.sellerId,
                item.amount
            );

            breakdown.push({
                productId: item.productId,
                sellerId: item.sellerId,
                amount: item.amount,
                commission: result.commission,
                rate: result.rate,
                ruleName: result.ruleName || "Unknown",
                sellerEarnings: item.amount - result.commission,
            });
        }

        return breakdown;
    }

    /**
     * Get category commission rates
     * For admin dashboard
     */
    async getCategoryCommissionRates(): Promise<
        Array<{
            categoryId: number;
            categoryName: string;
            rate: number;
            type: string;
        }>
    > {
        const rules = await db.query.commissionRules.findMany({
            where: and(
                eq(commissionRules.isActive, true),
                isNull(commissionRules.sellerId)
            ),
            with: {
                category: true,
            },
        });

        return rules
            .filter((r) => r.category)
            .map((r) => ({
                categoryId: r.categoryId!,
                categoryName: r.category?.name || "",
                rate: Number(r.commissionValue),
                type: r.commissionType,
            }));
    }
}

export const commissionService = new CommissionService();
