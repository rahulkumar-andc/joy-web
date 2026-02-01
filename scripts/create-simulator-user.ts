import "dotenv/config";
import { db } from "../server/db";
import { users } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function createSimulatorUser() {
    const email = "rahulvillen9@gmail.com";
    const password = "Vilen@123";
    const name = "villen";

    console.log(`🚀 Creating simulator user: ${email}...`);

    const hashedPassword = await hashPassword(password);

    try {
        const [user] = await db.insert(users).values({
            email,
            password: hashedPassword,
            name,
            role: "user",
            isVerified: true
        }).returning();

        console.log(`✅ User created successfully! ID: ${user.id}`);
    } catch (error: any) {
        if (error.code === '23505') {
            console.log("⚠️ User already exists. Updating verification status and password...");
            const [updated] = await db.update(users)
                .set({ password: hashedPassword, isVerified: true })
                .where(eq(users.email, email))
                .returning();
            console.log(`✅ User updated successfully! ID: ${updated.id}`);
        } else {
            console.error("❌ Failed to create user:", error);
        }
    } finally {
        process.exit(0);
    }
}

createSimulatorUser();
