import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { roles, userRoles } from "../shared/rbac-schema";
import { eq } from "drizzle-orm";

async function fixAdminRbac() {
    console.log("Fixing RBAC for admin user...");

    // 1. Get the admin user
    const adminUser = await db.query.users.findFirst({
        where: eq(users.email, "admin@example.com"),
    });

    if (!adminUser) {
        console.error("Admin user not found!");
        process.exit(1);
    }
    console.log(`Found admin user: ${adminUser.email} (ID: ${adminUser.id})`);

    // 2. Get the SUPER_ADMIN role
    const superAdminRole = await db.query.roles.findFirst({
        where: eq(roles.name, "SUPER_ADMIN"),
    });

    if (!superAdminRole) {
        console.error("SUPER_ADMIN role not found!");
        process.exit(1);
    }
    console.log(`Found SUPER_ADMIN role: ${superAdminRole.displayName} (ID: ${superAdminRole.id})`);

    // 3. Check if assignment exists
    const existingAssignment = await db.query.userRoles.findFirst({
        where: (ur, { and, eq }) => and(
            eq(ur.userId, adminUser.id),
            eq(ur.roleId, superAdminRole.id)
        ),
    });

    if (existingAssignment) {
        console.log("Admin user already has SUPER_ADMIN role.");
    } else {
        // 4. Assign role
        await db.insert(userRoles).values({
            userId: adminUser.id,
            roleId: superAdminRole.id,
            scopeType: "global",
            isActive: true,
        });
        console.log("Successfully assigned SUPER_ADMIN role to admin user.");
    }
}

fixAdminRbac()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
