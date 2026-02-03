import 'dotenv/config';
import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

async function updateUsersToSeller() {
    console.log("Fetching existing users...\n");

    const allUsers = await db.query.users.findMany({
        columns: { id: true, email: true, name: true, role: true }
    });

    console.log("Current users:");
    allUsers.forEach(u => console.log(`  ID: ${u.id}, Email: ${u.email}, Role: ${u.role}`));

    // Pick 3 users (not admin) to make sellers
    const nonAdminUsers = allUsers.filter(u => u.role !== 'admin');
    const usersToUpdate = nonAdminUsers.slice(0, 3);

    if (usersToUpdate.length === 0) {
        console.log("\nNo non-admin users found to update.");
        process.exit(0);
    }

    console.log(`\nUpdating ${usersToUpdate.length} users to seller role...`);

    const userIds = usersToUpdate.map(u => u.id);

    await db.update(users)
        .set({ role: 'seller' })
        .where(inArray(users.id, userIds));

    console.log("\n✅ Updated the following users to seller role:");
    usersToUpdate.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`));

    process.exit(0);
}

updateUsersToSeller().catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
});
