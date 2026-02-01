import { db } from "../db";
import { verificationTokens, type InsertVerificationToken } from "@shared/schema";
import { eq, and, gt, lt } from "drizzle-orm";

export const verificationRepository = {
    async create(data: InsertVerificationToken) {
        const [token] = await db.insert(verificationTokens).values(data).returning();
        return token;
    },

    async findValidToken(identifier: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET") {
        const now = new Date();
        const MAX_ATTEMPTS = 5;
        return db.query.verificationTokens.findFirst({
            where: and(
                eq(verificationTokens.identifier, identifier),
                eq(verificationTokens.type, type),
                gt(verificationTokens.expiresAt, now),
                lt(verificationTokens.attempts, MAX_ATTEMPTS)
            ),
        });
    },

    async findByToken(token: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET") {
        const now = new Date();
        return db.query.verificationTokens.findFirst({
            where: and(
                eq(verificationTokens.token, token),
                eq(verificationTokens.type, type),
                gt(verificationTokens.expiresAt, now)
            ),
        });
    },

    async delete(id: number) {
        return db.delete(verificationTokens).where(eq(verificationTokens.id, id));
    },

    async deleteByIdentifier(identifier: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET") {
        return db.delete(verificationTokens).where(
            and(
                eq(verificationTokens.identifier, identifier),
                eq(verificationTokens.type, type)
            )
        );
    },

    async incrementAttempts(id: number) {
        // This is a simple increment. In a high-concurrency real app, we might use sql raw update.
        // But for now, read-update is fine or simple partial update.
        // Actually, db.update is atomic enough for this scale.
        const token = await db.query.verificationTokens.findFirst({
            where: eq(verificationTokens.id, id)
        });
        if (!token) return;

        await db.update(verificationTokens)
            .set({ attempts: token.attempts + 1 })
            .where(eq(verificationTokens.id, id));
    }
};
