import "dotenv/config";
import { userRepository } from "../server/repositories/userRepository";
import { scrypt } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function verifyPassword(password: string, hash: string) {
    const [hashed, salt] = hash.split(".");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return buf.toString("hex") === hashed;
}

async function debugAuth() {
    console.log("--- DEBUGGING AUTH ---");
    const email = "admin@example.com";
    const password = "admin123";

    console.log(`Looking up user: ${email}`);
    const user = await userRepository.findByUsername(email);

    if (!user) {
        console.error("❌ User NOT FOUND in database.");
        process.exit(1);
    }

    console.log("✅ User found:");
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   IsVerified: ${user.isVerified}`);
    console.log(`   Password Hash: ${user.password.substring(0, 20)}...`);

    console.log(`\nTesting password: '${password}'`);
    try {
        const isValid = await verifyPassword(password, user.password);
        console.log(`   Password Match: ${isValid ? "✅ YES" : "❌ NO"}`);

        if (!isValid) {
            console.log("\n⚠️ Password mismatch detected.");
        }
    } catch (e) {
        console.error("Error verifying password:", e);
    }

    if (!user.isVerified) {
        console.log("\n⚠️ User is NOT verified. Attempting to verify...");
        await db.update(users).set({ isVerified: true }).where(eq(users.id, user.id));
        console.log("✅ User verification updated to TRUE.");
    }

    process.exit(0);
}

debugAuth().catch(console.error);
