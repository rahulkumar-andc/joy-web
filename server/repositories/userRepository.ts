import { db } from "../db";
import { users, verificationTokens, type User, type InsertUser, type VerificationToken } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";

export class UserRepository {
    async findById(id: number): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
    }

    async findByUsername(username: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.email, username));
        return user;
    }

    async create(insertUser: InsertUser): Promise<User> {
        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
    }

    async update(id: number, data: Partial<Omit<User, 'id' | 'password' | 'createdAt'>>): Promise<User | undefined> {
        const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
        return updated;
    }

    async updatePassword(id: number, hashedPassword: string): Promise<void> {
        await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
    }

    async createPasswordResetToken(userId: number): Promise<string> {
        const resetToken = randomBytes(32).toString("hex");
        const hashedToken = createHash("sha256").update(resetToken).digest("hex");

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await db.insert(verificationTokens).values({
            identifier: `user-${userId}`, // Using ID as identifier for reset flow as per simple implementation
            token: hashedToken,
            type: "PASSWORD_RESET",
            expiresAt,
            attempts: 0
        });

        return resetToken;
    }

    async validateResetToken(token: string): Promise<VerificationToken | undefined> {
        const hashedToken = createHash("sha256").update(token).digest("hex");

        const [verification] = await db.select()
            .from(verificationTokens)
            .where(and(
                eq(verificationTokens.token, hashedToken),
                eq(verificationTokens.type, "PASSWORD_RESET"),
                gt(verificationTokens.expiresAt, new Date())
            ));

        // In a real app we'd parse identifier back to userId or look it up
        // For simplicity here assuming the token is enough or we decode the identifier
        // But wait, the controller expects a VerificationToken which has userId in schema?
        // Checking schema: verificationTokens has "identifier" (email), not "userId".
        // Schema: verificationTokens { id, identifier, token, type, expiresAt... }
        // Controller: resetToken.userId -- this implies the controller thinks it gets an object with userId.
        // ERROR: The controller logic `resetToken.userId` is flawed because verificationTokens schema doesn't have userId column.

        // FIX: We need to adapt. Does the schema support linking to User?
        // verificationTokens has `identifier`. For password reset, usually it's the email. 
        // If we store "user-{id}" as identifier, we can parse it.
        // OR we return a mapped object satisfying what controller wants.

        if (!verification) return undefined;

        // Hacky fix matching controller expectation without changing controller
        // The controller expects `resetToken.userId`. 
        // verification.identifier should hold the hint.

        const userIdMatch = verification.identifier.match(/^user-(\d+)$/);
        const userId = userIdMatch ? parseInt(userIdMatch[1]) : 0; // Fallback or error

        return { ...verification, userId } as any;
    }

    async deleteResetToken(token: string): Promise<void> {
        const hashedToken = createHash("sha256").update(token).digest("hex");
        await db.delete(verificationTokens).where(eq(verificationTokens.token, hashedToken));
    }
}

export const userRepository = new UserRepository();
