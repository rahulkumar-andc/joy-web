import { db } from "../db";
import { users, walletTransactions, type InsertUser } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export class WalletService {
    static async creditWallet(userId: number, amount: number, referenceId: string, description: string) {
        return await db.transaction(async (tx) => {
            // 1. Create Transaction Record
            await tx.insert(walletTransactions).values({
                userId,
                amount: amount.toString(),
                type: "refund",
                referenceId,
                description
            });

            // 2. Update User Balance
            // Handle decimal addition safely using SQL
            await tx.update(users)
                .set({
                    walletBalance: sql`${users.walletBalance} + ${amount.toString()}`
                })
                .where(eq(users.id, userId));

            return true;
        });
    }

    static async getBalance(userId: number) {
        const [user] = await db.select({ balance: users.walletBalance }).from(users).where(eq(users.id, userId));
        return user?.balance || "0";
    }
}
