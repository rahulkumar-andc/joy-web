import "dotenv/config";
import { userRepository } from "../server/repositories/userRepository";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { users } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function createAdmin() {
    console.log("--- CREATING ADMIN USER ---");
    const email = "admin@example.com";
    const password = "admin123";

    const existingUser = await userRepository.findByUsername(email);
    if (existingUser) {
        console.log("✅ Admin user already exists (id:", existingUser.id, ")");
        return;
    }

    console.log("Generating password hash...");
    const hashedPassword = await hashPassword(password);

    console.log("Inserting user...");
    const user = await userRepository.create({
        email,
        password: hashedPassword,
        name: "Admin User",
        role: "admin",
        isVerified: true
    });

    // Force verification just in case create schema default interferes
    await db.update(users).set({ isVerified: true }).where(eq(users.id, user.id)); // Actually insertUserSchema excludes isVerified

    console.log("✅ Created admin user:", user);
    console.log("   Email:", user.email);
    console.log("   Role:", user.role);
    console.log("   IsVerified:", user.isVerified);

    process.exit(0);
}

createAdmin().catch(console.error);
