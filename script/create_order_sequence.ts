import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function createGlobalOrderSequence() {
    try {
        // Check if sequence exists
        const check = await db.execute(
            sql`SELECT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'global_order_seq')`
        );

        const exists = check.rows[0]?.exists;
        console.log("Sequence exists:", exists);

        if (!exists) {
            await db.execute(
                sql`CREATE SEQUENCE IF NOT EXISTS global_order_seq START WITH 100001`
            );
            console.log("✅ Created global_order_seq starting at 100001");
        } else {
            console.log("✅ Sequence already exists");
        }

        // Test the sequence
        const result = await db.execute(sql`SELECT nextval('global_order_seq') as seq`);
        console.log("Next sequence value:", result.rows[0]);

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
    process.exit(0);
}

createGlobalOrderSequence();
