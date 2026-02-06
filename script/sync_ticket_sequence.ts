/**
 * Sync ticket sequence with existing data
 */
import "dotenv/config";
import { db } from "../server/db";
import { supportTickets } from "../shared/schema";
import { sql, max } from "drizzle-orm";

async function syncTicketSequence() {
    console.log("Syncing global_ticket_seq with existing tickets...");

    // Get max sequence number from existing tickets
    const result = await db.select({ maxSeq: max(supportTickets.sequenceNumber) }).from(supportTickets);
    const maxSeq = result[0]?.maxSeq || 0;

    console.log(`Max existing sequence: ${maxSeq}`);

    // Set sequence to max + 1
    const newStart = maxSeq + 1;
    await db.execute(sql`SELECT setval('global_ticket_seq', ${newStart}, false)`);

    console.log(`✅ Sequence set to start at ${newStart}`);
    process.exit(0);
}

syncTicketSequence().catch(e => {
    console.error(e);
    process.exit(1);
});
