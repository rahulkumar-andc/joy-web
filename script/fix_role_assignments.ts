import "dotenv/config";
import { db } from "../server/db";
import { users, roles, userRoles } from "@shared/schema";
import { eq, like } from "drizzle-orm";

/**
 * Fix RBAC role assignments for existing test users
 */
async function fixRoleAssignments() {
    console.log("🔧 Fixing RBAC role assignments for existing users...\n");

    // Get all roles
    const allRoles = await db.select().from(roles);
    const roleMap = new Map(allRoles.map((r) => [r.name, r.id]));

    // Define email patterns and their expected roles
    const rolePatterns = [
        { pattern: "superadmin%", role: "SUPER_ADMIN" },
        { pattern: "businessadmin%", role: "BUSINESS_ADMIN" },
        { pattern: "opsadmin%", role: "OPS_ADMIN" },
        { pattern: "supportadmin%", role: "SUPPORT_ADMIN" },
        { pattern: "categorymanager%", role: "CATEGORY_MANAGER" },
        { pattern: "opsmanager%", role: "OPS_MANAGER" },
        { pattern: "supportagent%", role: "SUPPORT_AGENT" },
        { pattern: "selleradmin%", role: "SELLER_ADMIN" },
        { pattern: "sellermanager%", role: "SELLER_MANAGER" },
        { pattern: "deliverypartner%", role: "DELIVERY_PARTNER" },
    ];

    let totalFixed = 0;

    for (const { pattern, role } of rolePatterns) {
        const roleId = roleMap.get(role);
        if (!roleId) {
            console.log(`⚠️  Role not found: ${role}`);
            continue;
        }

        // Find users matching pattern
        const matchingUsers = await db.select().from(users).where(like(users.email, pattern));

        for (const user of matchingUsers) {
            // Check if role assignment exists
            const existingAssignment = await db.select().from(userRoles)
                .where(eq(userRoles.userId, user.id));

            if (existingAssignment.length === 0) {
                // Create role assignment
                await db.insert(userRoles).values({
                    userId: user.id,
                    roleId: roleId,
                    scopeType: "global",
                    isActive: true,
                }).onConflictDoNothing();

                console.log(`✅ Assigned ${role} to ${user.email}`);
                totalFixed++;
            } else {
                console.log(`⏭️  ${user.email} already has role assignment`);
            }
        }
    }

    console.log(`\n📊 Summary: Fixed ${totalFixed} role assignments`);
    process.exit(0);
}

fixRoleAssignments().catch((err) => {
    console.error("❌ Failed:", err);
    process.exit(1);
});
