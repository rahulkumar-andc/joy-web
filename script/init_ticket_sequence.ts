
import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function initTicketSequence() {
    console.log("Initializing global_ticket_seq...");
    try {
        await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS global_ticket_seq START 1;`);

        const result = await db.execute(sql`SELECT last_value FROM global_ticket_seq;`);
        console.log("Ticket Sequence initialized. Current/Last Value:", result.rows[0]);

        console.log("✅ Sequence 'global_ticket_seq' ready.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to initialize sequence:", error);
        process.exit(1);
    }
}

initTicketSequence();
