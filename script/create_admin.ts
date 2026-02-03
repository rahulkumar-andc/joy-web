import 'dotenv/config';
import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function createAdmin() {
    const email = "admin@example.com";
    const password = "password123";
    const hashedPassword = await hashPassword(password);

    console.log(`Checking for admin user: ${email}`);

    const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
    });

    if (existingUser) {
        console.log("Admin user exists. Updating password and role...");
        await db.update(users)
            .set({
                password: hashedPassword,
                role: "admin",
                isVerified: true
            })
            .where(eq(users.id, existingUser.id));
        console.log("Admin user updated.");
    } else {
        console.log("Creating new admin user...");
        await db.insert(users).values({
            email,
            password: hashedPassword,
            name: "System Admin",
            role: "admin",
            isVerified: true,
            walletBalance: "0",
        });
        console.log("Admin user created.");
    }

    process.exit(0);
}

createAdmin().catch((err) => {
    console.error("Failed to create admin:", err);
    process.exit(1);
});
