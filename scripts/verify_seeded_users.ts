import "dotenv/config";
import { db } from "../server/db";
import { users } from "@shared/schema";
import { roles, userRoles } from "@shared/rbac-schema";
import { eq, sql } from "drizzle-orm";

async function verifySeeding() {
    console.log("Verifying seeded users...");

    const result = await db.select({
        roleName: roles.name,
        count: sql<number>`count(${users.id})`
    })
        .from(users)
        .innerJoin(userRoles, eq(users.id, userRoles.userId))
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .groupBy(roles.name)
        .orderBy(roles.name);

    console.log("\nUser counts per role:");
    console.table(result);

    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
    console.log(`\nTotal users in database: ${totalUsers[0].count}`);

    process.exit(0);
}

verifySeeding().catch(console.error);
