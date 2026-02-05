import 'dotenv/config';
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Updating user 2 to admin...");
    try {
        await db.update(users)
            .set({ role: "admin" })
            .where(eq(users.id, 2));
        console.log("Successfully updated User 2 to admin.");
    } catch (error) {
        console.error("Error updating user:", error);
    }
    process.exit(0);
}

main();
