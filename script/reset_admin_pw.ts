
import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function reset() {
    const email = "superadmin2@example.com";
    const password = "password123";
    const hash = await hashPassword(password);

    await db.update(users)
        .set({ password: hash })
        .where(eq(users.email, email));

    console.log(`Password for ${email} reset to ${password}`);
    process.exit(0);
}

reset();
