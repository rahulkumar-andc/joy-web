
import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { supportRepository } from "../server/repositories/supportRepository";

async function debugTickets() {
    try {
        console.log("=== 1. RAW DB CHECK ===");
        const count = await db.execute(sql`SELECT COUNT(*) as total FROM support_tickets`);
        console.log("Total tickets in DB:", count.rows[0]);

        const rawTickets = await db.execute(sql`SELECT * FROM support_tickets LIMIT 5`);
        console.table(rawTickets.rows);

        console.log("\n=== 2. REPOSITORY CHECK (getAllTickets) ===");
        try {
            const allTickets = await supportRepository.getAllTickets(1, 10, {});
            console.log(`Repository found ${allTickets.total} tickets.`);
            if (allTickets.tickets.length > 0) {
                console.log("Sample ticket from Repo:", JSON.stringify(allTickets.tickets[0], null, 2));
            } else {
                console.log("No tickets returned by repository.");
            }
        } catch (err) {
            console.error("Repository Error:", err);
        }

        console.log("\n=== 3. REPOSITORY CHECK (Filters) ===");
        try {
            const openTickets = await supportRepository.getAllTickets(1, 10, { status: "OPEN" });
            console.log(`OPEN tickets: ${openTickets.total}`);
        } catch (err) {
            console.error("Repository Filter Error:", err);
        }

    } catch (error) {
        console.error("Global Error:", error);
    }
    process.exit(0);
}

debugTickets();
