import "dotenv/config";
import { db } from "../server/db";
import { users, roles, userRoles } from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/**
 * ====================================================================
 * SEED TEST USERS - Creates 5 test users for each role
 * ====================================================================
 * 
 * Password for all users: Password123!
 * 
 * Role               | Email Pattern
 * -------------------|----------------------------------
 * SUPER_ADMIN        | superadmin1-5@example.com
 * BUSINESS_ADMIN     | businessadmin1-5@example.com
 * OPS_ADMIN          | opsadmin1-5@example.com
 * SUPPORT_ADMIN      | supportadmin1-5@example.com
 * CATEGORY_MANAGER   | categorymanager1-5@example.com
 * OPS_MANAGER        | opsmanager1-5@example.com
 * SUPPORT_AGENT      | supportagent1-5@example.com
 * SELLER_ADMIN       | selleradmin1-5@example.com
 * SELLER_MANAGER     | sellermanager1-5@example.com
 * DELIVERY_PARTNER   | deliverypartner1-5@example.com
 * USER               | user1-5@example.com
 */

const ROLE_CONFIG = [
    { roleName: "SUPER_ADMIN", emailPrefix: "superadmin", displayName: "Super Admin" },
    { roleName: "BUSINESS_ADMIN", emailPrefix: "businessadmin", displayName: "Business Admin" },
    { roleName: "OPS_ADMIN", emailPrefix: "opsadmin", displayName: "Ops Admin" },
    { roleName: "SUPPORT_ADMIN", emailPrefix: "supportadmin", displayName: "Support Admin" },
    { roleName: "CATEGORY_MANAGER", emailPrefix: "categorymanager", displayName: "Category Manager" },
    { roleName: "OPS_MANAGER", emailPrefix: "opsmanager", displayName: "Ops Manager" },
    { roleName: "SUPPORT_AGENT", emailPrefix: "supportagent", displayName: "Support Agent" },
    { roleName: "SELLER_ADMIN", emailPrefix: "selleradmin", displayName: "Seller Admin" },
    { roleName: "SELLER_MANAGER", emailPrefix: "sellermanager", displayName: "Seller Manager" },
    { roleName: "DELIVERY_PARTNER", emailPrefix: "deliverypartner", displayName: "Delivery Partner" },
    { roleName: "USER", emailPrefix: "user", displayName: "User" },
];

const DEFAULT_PASSWORD = "Password123!";
const USERS_PER_ROLE = 5;

async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function seedTestUsers() {
    console.log("🚀 Starting test user seeding...\n");
    console.log(`📍 Password for all users: ${DEFAULT_PASSWORD}\n`);

    // Fetch all roles
    const allRoles = await db.select().from(roles);
    const roleMap = new Map(allRoles.map((r) => [r.name, r.id]));

    if (roleMap.size === 0) {
        console.error("❌ No roles found! Please run RBAC seed first:");
        console.error("   npx tsx shared/rbac-seed.ts");
        process.exit(1);
    }

    console.log(`✅ Found ${roleMap.size} roles in database\n`);

    const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
    let totalCreated = 0;
    let totalSkipped = 0;

    console.log("━".repeat(60));
    console.log("Role                 | Email Pattern");
    console.log("━".repeat(60));

    for (const config of ROLE_CONFIG) {
        const roleId = roleMap.get(config.roleName);

        if (!roleId) {
            console.log(`⚠️  Role not found: ${config.roleName} - skipping`);
            continue;
        }

        console.log(`${config.displayName.padEnd(20)} | ${config.emailPrefix}1-${USERS_PER_ROLE}@example.com`);

        for (let i = 1; i <= USERS_PER_ROLE; i++) {
            const email = `${config.emailPrefix}${i}@example.com`;
            const name = `${config.displayName} ${i}`;

            // Check if user exists
            const existingUser = await db.query.users.findFirst({
                where: eq(users.email, email),
            });

            if (existingUser) {
                totalSkipped++;
                continue;
            }

            // Create user
            const [newUser] = await db.insert(users).values({
                email,
                password: hashedPassword,
                name,
                role: "user", // Legacy field - keep as user
                isVerified: true,
                walletBalance: "0",
            }).returning();

            // Assign RBAC role
            await db.insert(userRoles).values({
                userId: newUser.id,
                roleId: roleId,
                scopeType: "global",
                isActive: true,
            }).onConflictDoNothing();

            totalCreated++;
        }
    }

    console.log("━".repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Created: ${totalCreated} users`);
    console.log(`   ⏭️  Skipped: ${totalSkipped} users (already exist)`);
    console.log(`   📦 Total roles: ${ROLE_CONFIG.length}`);
    console.log(`   👤 Users per role: ${USERS_PER_ROLE}`);
    console.log(`\n🔑 Password for all users: ${DEFAULT_PASSWORD}`);
    console.log("\n✨ Seeding complete!");

    process.exit(0);
}

seedTestUsers().catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
