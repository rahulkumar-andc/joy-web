import { db } from "../db";
import { users } from "@shared/schema";
import { eq, desc, and, ilike, sql, ne } from "drizzle-orm";

type UserFilter = {
    role?: string;
    search?: string;
};

export const userService = {
    async getAllUsers(filters: UserFilter = {}, page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        let conditions = undefined;
        const conditionsList = [];

        if (filters.role && filters.role !== 'all') {
            conditionsList.push(eq(users.role, filters.role as any));
        }

        if (filters.search) {
            conditionsList.push(
                sql`(${users.name} ILIKE ${`%${filters.search}%`} OR ${users.email} ILIKE ${`%${filters.search}%`} OR ${users.phone} ILIKE ${`%${filters.search}%`})`
            );
        }

        if (conditionsList.length > 0) {
            conditions = and(...conditionsList);
        }

        const results = await db.select()
            .from(users)
            .where(conditions)
            .orderBy(desc(users.createdAt))
            .limit(limit)
            .offset(offset);

        // Get total count
        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(conditions);

        // Sanitize results (remove password)
        const sanitizedUsers = results.map((u: typeof users.$inferSelect) => {
            const { password, ...rest } = u;
            return rest;
        });

        return {
            users: sanitizedUsers,
            total: Number(count),
            page,
            limit
        };
    },

    async manageUser(userId: number, adminId: number, data: { role?: string, isVerified?: boolean }) {
        // Prevent self-modification destructiveness if needed, but admin might demote themselves? 
        // Better to check if adminId === userId for critical actions in controller or here.
        if (userId === adminId && data.role && data.role !== 'admin') {
            throw new Error("You cannot remove your own admin status.");
        }

        const updates: any = {};
        if (data.role) updates.role = data.role;
        if (data.isVerified !== undefined) updates.isVerified = data.isVerified;

        if (Object.keys(updates).length === 0) {
            return { success: true, message: "No changes requested" };
        }

        await db.update(users)
            .set(updates)
            .where(eq(users.id, userId));

        return { success: true, message: "User updated successfully" };
    }
};
