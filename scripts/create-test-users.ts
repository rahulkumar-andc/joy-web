import "dotenv/config";
import { db } from "../server/db";
import { users } from "@shared/schema";
import { roles, userRoles } from "@shared/rbac-schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

// All 11 RBAC roles
const RBAC_ROLES = [
    "SUPER_ADMIN",
    "BUSINESS_ADMIN",
    "OPS_ADMIN",
    "SUPPORT_ADMIN",
    "CATEGORY_MANAGER",
    "OPS_MANAGER",
    "SUPPORT_AGENT",
    "SELLER_ADMIN",
    "SELLER_MANAGER",
    "DELIVERY_PARTNER",
    "USER",
];

// Map RBAC role to legacy user.role field
const roleMapping: Record<string, "admin" | "seller" | "manager" | "user"> = {
    SUPER_ADMIN: "admin",
    BUSINESS_ADMIN: "admin",
    OPS_ADMIN: "admin",
    SUPPORT_ADMIN: "admin",
    CATEGORY_MANAGER: "manager",
    OPS_MANAGER: "manager",
    SUPPORT_AGENT: "manager",
    SELLER_ADMIN: "seller",
    SELLER_MANAGER: "seller",
    DELIVERY_PARTNER: "user",
    USER: "user",
};

async function createTestUsers() {
    console.log("--- CREATING 5 TEST USERS FOR EACH OF 11 RBAC ROLES ---\n");

    const password = "Password123!";
    const hashedPassword = await hashPassword(password);

    // Get all role IDs from database
    const allRoles = await db.select().from(roles);
    const roleIdMap = new Map(allRoles.map((r) => [r.name, r.id]));

    let created = 0;
    let skipped = 0;

    for (const roleName of RBAC_ROLES) {
        const roleId = roleIdMap.get(roleName);
        if (!roleId) {
            console.log(`⚠️  Role not found in DB: ${roleName}`);
            continue;
        }

        console.log(`\n📋 Creating users for role: ${roleName}`);
        console.log("─".repeat(50));

        for (let i = 1; i <= 5; i++) {
            const email = `${roleName.toLowerCase().replace(/_/g, "")}${i}@example.com`;
            const name = `${roleName.replace(/_/g, " ")} User ${i}`;
            const legacyRole = roleMapping[roleName] || "user";

            try {
                // Create user
                const [user] = await db
                    .insert(users)
                    .values({
                        name,
                        email,
                        password: hashedPassword,
                        role: legacyRole,
                        isVerified: true,
                    })
                    .returning();

                // Assign RBAC role
                await db
                    .insert(userRoles)
                    .values({
                        userId: user.id,
                        roleId,
                        assignedBy: 1, // Admin user
                    })
                    .onConflictDoNothing();

                console.log(`  ✅ ${name} <${email}>`);
                created++;
            } catch (error: any) {
                if (error.code === "23505") {
                    console.log(`  ⏩ Skipped: ${email} (already exists)`);
                    skipped++;
                } else {
                    console.error(`  ❌ Error creating ${email}:`, error.message);
                }
            }
        }
    }

    console.log("\n" + "═".repeat(50));
    console.log(`✅ Created: ${created} users`);
    console.log(`⏩ Skipped: ${skipped} users (already existed)`);
    console.log(`📊 Total roles: ${RBAC_ROLES.length}`);
    console.log("═".repeat(50));
    console.log("\n🔑 Password for all users: Password123!");
    console.log("═".repeat(50));

    process.exit(0);
}

createTestUsers().catch(console.error);
