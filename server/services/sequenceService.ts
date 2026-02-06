import { db } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "../logger";

/**
 * Ensures all required database sequences exist.
 * This is called during server startup to prevent runtime errors.
 */
export async function ensureDatabaseSequences(): Promise<void> {
    const sequences = [
        { name: "global_order_seq", startWith: 100001 },
        { name: "global_ticket_seq", startWith: 1001 },
        // Add more sequences here as needed
    ];

    for (const seq of sequences) {
        try {
            // Check if sequence exists
            const check = await db.execute(
                sql`SELECT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = ${seq.name})`
            );

            const exists = (check.rows[0] as any)?.exists;

            if (!exists) {
                // Create sequence dynamically
                await db.execute(sql.raw(`CREATE SEQUENCE IF NOT EXISTS ${seq.name} START WITH ${seq.startWith}`));
                logger.info(`✅ Created missing sequence: ${seq.name} (starting at ${seq.startWith})`);
            }
        } catch (error) {
            logger.error(`❌ Failed to ensure sequence ${seq.name}:`, error);
            // Don't throw - let server continue, but log the error
        }
    }
}
