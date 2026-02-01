import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkSchema() {
    try {
        console.log("Checking users table columns...");
        const result = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY column_name;
        `);
        console.table(result.rows);

        console.log("Checking tables...");
        const tables = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.table(tables.rows);

        process.exit(0);
    } catch (error) {
        console.error("Check failed:", error);
        process.exit(1);
    }
}

checkSchema();
