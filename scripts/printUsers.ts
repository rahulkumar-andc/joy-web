import "dotenv/config";
import { db } from "../server/db";
import { users } from "@shared/schema";

async function printUsers() {
    console.log("--- FETCHING ALL USERS ---\n");

    const allUsers = await db.select().from(users);

    if (allUsers.length === 0) {
        console.log("No users found in the database.");
    } else {
        console.log(`Found ${allUsers.length} users:\n`);
        allUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name || "N/A"}`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Verified: ${user.isVerified}`);
            console.log("");
        });
    }

    process.exit(0);
}

printUsers().catch(console.error);
