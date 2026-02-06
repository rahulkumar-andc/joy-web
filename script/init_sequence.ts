
import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function initSequence() {
    console.log("Initializing global_order_seq...");
    try {
        // Create sequence starting at 1000 for aesthetics (optional, but requested starts at simple 1/seq)
        // Using IF NOT EXISTS to be safe.
        await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS global_order_seq START 1;`);

        // Check current value (just to verify)
        const result = await db.execute(sql`SELECT last_value FROM global_order_seq;`);
        console.log("Sequence initialized. Current/Last Value:", result.rows[0]);

        console.log("✅ Sequence 'global_order_seq' ready.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to initialize sequence:", error);
        process.exit(1);
    }
}

initSequence();
