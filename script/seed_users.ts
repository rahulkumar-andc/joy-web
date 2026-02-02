
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

async function seedUsers() {
    console.log("Seeding 15 test users...");

    const password = await hashPassword("user123");

    for (let i = 1; i <= 15; i++) {
        const email = `user${i}@gmail.com`;
        const name = `Test User ${i}`;

        // Check if user exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (existingUser) {
            console.log(`User ${email} already exists.`);
        } else {
            await db.insert(users).values({
                email,
                password,
                name,
                role: "user",
                isVerified: true,
                walletBalance: "0",
            });
            console.log(`Created user: ${email}`);
        }
    }

    console.log("Seeding complete.");
    process.exit(0);
}

seedUsers().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
