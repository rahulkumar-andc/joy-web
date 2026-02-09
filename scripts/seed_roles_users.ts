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

const ROLES_TO_SEED = [
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
    "USER"
];

async function seedUsers() {
    console.log("Starting user seeding...");

    // Get all roles from DB
    const dbRoles = await db.select().from(roles);
    const roleMap = new Map(dbRoles.map(r => [r.name, r.id]));

    for (const roleName of ROLES_TO_SEED) {
        const roleId = roleMap.get(roleName);

        if (!roleId) {
            console.warn(`Role ${roleName} not found in database. Skipping.`);
            continue;
        }

        console.log(`Seeding users for role: ${roleName}`);

        for (let i = 1; i <= 5; i++) {
            // Format email: super.admin.1@joy.com
            const email = `${roleName.toLowerCase().replace(/_/g, '.')}.${i}@joy.com`;
            // Format name: Super Admin 1
            const roleDisplayName = roleName.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
            const name = `${roleDisplayName} ${i}`;
            const password = "Vilen@123";

            // Generate unique hash for each user
            const hashedPassword = await hashPassword(password);

            try {
                // 1. Check if user already exists
                const existingUser = await db.select().from(users).where(eq(users.email, email));

                let userId;

                if (existingUser.length > 0) {
                    console.log(`User ${email} already exists. Updating password.`);
                    userId = existingUser[0].id;
                    // Update password just in case
                    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
                } else {
                    // Create User
                    const [newUser] = await db.insert(users).values({
                        email,
                        password: hashedPassword,
                        name,
                        role: "user", // Default role in main table, RBAC handles specific roles
                        isVerified: true,
                        walletBalance: "1000.00",
                    }).returning();
                    userId = newUser.id;
                    console.log(`Created user: ${email}`);
                }

                // 2. Assign Role in RBAC
                // Check if role is already assigned
                const existingRole = await db.select()
                    .from(userRoles)
                    .where(sql`${userRoles.userId} = ${userId} AND ${userRoles.roleId} = ${roleId}`);

                if (existingRole.length === 0) {
                    await db.insert(userRoles).values({
                        userId: userId,
                        roleId: roleId,
                        scopeType: "global",
                        isActive: true
                    });
                    console.log(`Assigned role ${roleName} to ${email}`);
                } else {
                    console.log(`Role ${roleName} already assigned to ${email}`);
                }

            } catch (error) {
                console.error(`Failed to process user ${email}:`, error);
            }
        }
    }

    console.log("Seeding complete.");
    process.exit(0);
}

// Helper sql import needed for the check
import { sql } from "drizzle-orm";

seedUsers().catch(err => {
    console.error(err);
    process.exit(1);
});
