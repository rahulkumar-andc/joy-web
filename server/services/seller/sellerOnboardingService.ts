import { db } from "../../db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
    sellerProfiles,
    sellerWallets,
    sellerVerificationTokens,
    sellerNotifications,
    SellerProfile,
    InsertSellerProfile,
} from "@shared/seller-schema";
import { users } from "@shared/schema";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { emailService } from "../emailService";
import { smsService } from "../smsService";
import { logger } from "../../logger";

const scryptAsync = promisify(scrypt);

// ============================================================================
// SELLER ONBOARDING SERVICE
// Handles seller registration, verification, and approval workflow
// ============================================================================

class SellerOnboardingService {
    // Generate a random 6-digit OTP
    private generateOTP(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Hash OTP for storage
    private async hashOTP(otp: string): Promise<string> {
        const salt = randomBytes(16).toString("hex");
        const buf = (await scryptAsync(otp, salt, 64)) as Buffer;
        return `${buf.toString("hex")}.${salt}`;
    }

    // Verify OTP against hash
    private async verifyOTPHash(otp: string, hash: string): Promise<boolean> {
        const [hashed, salt] = hash.split(".");
        const buf = (await scryptAsync(otp, salt, 64)) as Buffer;
        return buf.toString("hex") === hashed;
    }

    /**
     * Register a new seller
     * Creates seller profile in PENDING status
     */
    async registerSeller(
        userId: number,
        data: Omit<InsertSellerProfile, "userId">
    ): Promise<{ success: boolean; sellerId?: number; error?: string }> {
        try {
            // Check if user already has a seller profile
            const existingSeller = await db.query.sellerProfiles.findFirst({
                where: eq(sellerProfiles.userId, userId),
            });

            if (existingSeller) {
                return {
                    success: false,
                    error: "User already has a seller profile",
                };
            }

            // Check if user exists
            const user = await db.query.users.findFirst({
                where: eq(users.id, userId),
            });

            if (!user) {
                return { success: false, error: "User not found" };
            }

            // Create seller profile
            const [seller] = await db
                .insert(sellerProfiles)
                .values({
                    userId,
                    ...data,
                    status: "pending",
                    emailVerified: false,
                    phoneVerified: false,
                })
                .returning();

            return { success: true, sellerId: seller.id };
        } catch (error) {
            console.error("[SellerOnboarding] Registration error:", error);
            return { success: false, error: "Failed to register seller" };
        }
    }

    /**
     * Send verification OTP to email or phone
     */
    async sendVerificationOTP(
        sellerId: number | null,
        userId: number,
        type: "email" | "phone",
        identifier: string
    ): Promise<{ success: boolean; message?: string; error?: string }> {
        try {
            // Generate OTP
            const otp = this.generateOTP();
            const hashedOTP = await this.hashOTP(otp);

            // Set expiry (10 minutes)
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            // Delete existing tokens for this identifier
            await db
                .delete(sellerVerificationTokens)
                .where(
                    and(
                        eq(sellerVerificationTokens.identifier, identifier),
                        eq(sellerVerificationTokens.type, type)
                    )
                );

            // Create new token
            await db.insert(sellerVerificationTokens).values({
                sellerId,
                userId,
                identifier,
                token: hashedOTP,
                type,
                expiresAt,
                attempts: 0,
                verified: false,
            });

            // Send OTP via email or SMS
            if (type === "email") {
                const result = await emailService.sendOTP(identifier, otp);
                logger.info(`Email OTP sent to ${identifier}: ${result.success}`);
            } else {
                const result = await smsService.sendOTP(identifier, otp);
                logger.info(`SMS OTP sent to ${identifier}: ${result.success}`);
            }

            // Log OTP in development for testing
            if (process.env.NODE_ENV === "development") {
                logger.info(`[DEV] OTP for ${type} ${identifier}: ${otp}`);
            }

            return {
                success: true,
                message: `OTP sent to ${type === "email" ? "email" : "phone"}`,
            };
        } catch (error) {
            console.error("[SellerOnboarding] Send OTP error:", error);
            return { success: false, error: "Failed to send OTP" };
        }
    }

    /**
     * Verify OTP for email or phone
     */
    async verifyOTP(
        type: "email" | "phone",
        identifier: string,
        otp: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Find the token
            const token = await db.query.sellerVerificationTokens.findFirst({
                where: and(
                    eq(sellerVerificationTokens.identifier, identifier),
                    eq(sellerVerificationTokens.type, type),
                    eq(sellerVerificationTokens.verified, false)
                ),
            });

            if (!token) {
                return { success: false, error: "No pending verification found" };
            }

            // Check expiry
            if (new Date() > token.expiresAt) {
                return { success: false, error: "OTP expired" };
            }

            // Check attempts (max 3)
            if (token.attempts >= 3) {
                return { success: false, error: "Too many attempts. Please request a new OTP" };
            }

            // Verify OTP
            const isValid = await this.verifyOTPHash(otp, token.token);

            if (!isValid) {
                // Increment attempts
                await db
                    .update(sellerVerificationTokens)
                    .set({ attempts: token.attempts + 1 })
                    .where(eq(sellerVerificationTokens.id, token.id));

                return { success: false, error: "Invalid OTP" };
            }

            // Mark as verified
            await db
                .update(sellerVerificationTokens)
                .set({ verified: true })
                .where(eq(sellerVerificationTokens.id, token.id));

            // Update seller profile
            if (token.sellerId) {
                const updateField = type === "email" ? { emailVerified: true } : { phoneVerified: true };
                await db
                    .update(sellerProfiles)
                    .set({ ...updateField, updatedAt: new Date() })
                    .where(eq(sellerProfiles.id, token.sellerId));
            }

            return { success: true };
        } catch (error) {
            console.error("[SellerOnboarding] Verify OTP error:", error);
            return { success: false, error: "Failed to verify OTP" };
        }
    }

    /**
     * Get seller profile by user ID
     */
    async getSellerByUserId(userId: number): Promise<SellerProfile | null> {
        const seller = await db.query.sellerProfiles.findFirst({
            where: eq(sellerProfiles.userId, userId),
        });
        return seller || null;
    }

    /**
     * Get seller profile by ID
     */
    async getSellerById(sellerId: number): Promise<SellerProfile | null> {
        const seller = await db.query.sellerProfiles.findFirst({
            where: eq(sellerProfiles.id, sellerId),
        });
        return seller || null;
    }

    /**
   * Update seller profile
   * Note: Uses Partial<SellerProfile> for updates to allow any field
   */
    async updateSellerProfile(
        sellerId: number,
        data: Partial<Omit<SellerProfile, "id" | "createdAt">>
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // If bank details are being updated, reset bankVerified
            const bankFields = ["bankAccountNumber", "bankIfscCode", "bankAccountName", "bankName"];
            const isBankUpdate = bankFields.some(field => field in data);

            const updateData = {
                ...data,
                ...(isBankUpdate ? { bankVerified: false } : {}),
                updatedAt: new Date(),
            };

            await db
                .update(sellerProfiles)
                .set(updateData)
                .where(eq(sellerProfiles.id, sellerId));

            return { success: true };
        } catch (error) {
            console.error("[SellerOnboarding] Update profile error:", error);
            return { success: false, error: "Failed to update profile" };
        }
    }

    /**
     * Get all pending seller applications (for admin)
     */
    async getPendingSellers(
        page: number = 1,
        limit: number = 20
    ): Promise<{ sellers: SellerProfile[]; total: number }> {
        const offset = (page - 1) * limit;

        const sellers = await db.query.sellerProfiles.findMany({
            where: eq(sellerProfiles.status, "pending"),
            orderBy: [desc(sellerProfiles.createdAt)],
            limit,
            offset,
        });

        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(sellerProfiles)
            .where(eq(sellerProfiles.status, "pending"));

        return { sellers, total: Number(count) };
    }

    /**
     * Approve seller application (admin)
     */
    async approveSeller(
        sellerId: number,
        adminId: number
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const seller = await this.getSellerById(sellerId);

            if (!seller) {
                return { success: false, error: "Seller not found" };
            }

            if (seller.status !== "pending") {
                return { success: false, error: `Cannot approve seller with status: ${seller.status}` };
            }

            // Update seller status
            await db
                .update(sellerProfiles)
                .set({
                    status: "approved",
                    approvedBy: adminId,
                    approvedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(sellerProfiles.id, sellerId));

            // Create seller wallet
            await db.insert(sellerWallets).values({
                sellerId,
            });

            // Update user role to seller
            await db
                .update(users)
                .set({ role: "seller" })
                .where(eq(users.id, seller.userId));

            // Send notification
            await this.sendNotification(sellerId, {
                type: "account_approved",
                title: "Congratulations! Your seller account is approved",
                message: "You can now start listing products and receiving orders.",
            });

            // Send approval email
            await emailService.sendSellerApprovalEmail(seller.businessEmail, seller.shopName);

            return { success: true };
        } catch (error) {
            console.error("[SellerOnboarding] Approve error:", error);
            return { success: false, error: "Failed to approve seller" };
        }
    }

    /**
     * Reject seller application (admin)
     */
    async rejectSeller(
        sellerId: number,
        adminId: number,
        reason: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const seller = await this.getSellerById(sellerId);

            if (!seller) {
                return { success: false, error: "Seller not found" };
            }

            if (seller.status !== "pending") {
                return { success: false, error: `Cannot reject seller with status: ${seller.status}` };
            }

            await db
                .update(sellerProfiles)
                .set({
                    status: "rejected",
                    statusReason: reason,
                    approvedBy: adminId,
                    updatedAt: new Date(),
                })
                .where(eq(sellerProfiles.id, sellerId));

            // Send notification
            await this.sendNotification(sellerId, {
                type: "account_suspended",
                title: "Seller application rejected",
                message: `Reason: ${reason}`,
            });

            // Send rejection email
            await emailService.sendSellerRejectionEmail(seller.businessEmail, seller.shopName, reason);

            return { success: true };
        } catch (error) {
            console.error("[SellerOnboarding] Reject error:", error);
            return { success: false, error: "Failed to reject seller" };
        }
    }

    /**
     * Suspend an active seller (admin)
     */
    async suspendSeller(
        sellerId: number,
        adminId: number,
        reason: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const seller = await this.getSellerById(sellerId);

            if (!seller) {
                return { success: false, error: "Seller not found" };
            }

            if (seller.status !== "approved") {
                return { success: false, error: `Cannot suspend seller with status: ${seller.status}` };
            }

            await db
                .update(sellerProfiles)
                .set({
                    status: "suspended",
                    statusReason: reason,
                    suspendedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(eq(sellerProfiles.id, sellerId));

            // Send notification
            await this.sendNotification(sellerId, {
                type: "account_suspended",
                title: "Your seller account has been suspended",
                message: `Reason: ${reason}`,
            });

            return { success: true };
        } catch (error) {
            console.error("[SellerOnboarding] Suspend error:", error);
            return { success: false, error: "Failed to suspend seller" };
        }
    }

    /**
     * Blacklist a seller (admin) - permanent
     */
    async blacklistSeller(
        sellerId: number,
        adminId: number,
        reason: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const seller = await this.getSellerById(sellerId);

            if (!seller) {
                return { success: false, error: "Seller not found" };
            }

            await db
                .update(sellerProfiles)
                .set({
                    status: "blacklisted",
                    statusReason: reason,
                    updatedAt: new Date(),
                })
                .where(eq(sellerProfiles.id, sellerId));

            // Send notification
            await this.sendNotification(sellerId, {
                type: "account_suspended",
                title: "Your seller account has been permanently disabled",
                message: `Reason: ${reason}`,
            });

            return { success: true };
        } catch (error) {
            console.error("[SellerOnboarding] Blacklist error:", error);
            return { success: false, error: "Failed to blacklist seller" };
        }
    }

    /**
     * Reactivate a suspended seller (admin)
     */
    async reactivateSeller(
        sellerId: number,
        adminId: number
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const seller = await this.getSellerById(sellerId);

            if (!seller) {
                return { success: false, error: "Seller not found" };
            }

            if (seller.status !== "suspended") {
                return { success: false, error: `Cannot reactivate seller with status: ${seller.status}` };
            }

            await db
                .update(sellerProfiles)
                .set({
                    status: "approved",
                    statusReason: null,
                    suspendedAt: null,
                    updatedAt: new Date(),
                })
                .where(eq(sellerProfiles.id, sellerId));

            // Send notification
            await this.sendNotification(sellerId, {
                type: "account_approved",
                title: "Your seller account has been reactivated",
                message: "You can now continue listing products and receiving orders.",
            });

            return { success: true };
        } catch (error) {
            console.error("[SellerOnboarding] Reactivate error:", error);
            return { success: false, error: "Failed to reactivate seller" };
        }
    }

    /**
     * Get all sellers with filters (admin)
     */
    async getAllSellers(
        filters: {
            status?: SellerProfile["status"];
            search?: string;
        },
        page: number = 1,
        limit: number = 20
    ): Promise<{ sellers: SellerProfile[]; total: number; stats: Record<string, number> }> {
        const offset = (page - 1) * limit;

        let whereClause = undefined;

        if (filters.status) {
            whereClause = eq(sellerProfiles.status, filters.status);
        }

        const sellers = await db.query.sellerProfiles.findMany({
            where: whereClause,
            orderBy: [desc(sellerProfiles.createdAt)],
            limit,
            offset,
        });

        // Get total count for pagination
        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(sellerProfiles)
            .where(whereClause);

        // Get overall stats (independent of filters)
        const statsRows = await db
            .select({
                status: sellerProfiles.status,
                count: sql<number>`count(*)`
            })
            .from(sellerProfiles)
            .groupBy(sellerProfiles.status);

        const stats = statsRows.reduce((acc, curr) => {
            acc[curr.status || "unknown"] = Number(curr.count);
            return acc;
        }, {} as Record<string, number>);

        return { sellers, total: Number(count), stats };
    }

    /**
     * Send notification to seller
     */
    private async sendNotification(
        sellerId: number,
        notification: {
            type: "account_approved" | "account_suspended" | "order_new" | "payout_completed" | "product_approved" | "product_rejected" | "system";
            title: string;
            message: string;
            data?: Record<string, any>;
        }
    ): Promise<void> {
        try {
            await db.insert(sellerNotifications).values({
                sellerId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
            });

            // TODO: Also send email/SMS notification based on seller preferences
        } catch (error) {
            console.error("[SellerOnboarding] Send notification error:", error);
        }
    }
}

export const sellerOnboardingService = new SellerOnboardingService();
