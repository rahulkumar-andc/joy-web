
import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function verifyColumns() {
    console.log("Verifying 'products' table columns...");

    const result = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name IN ('price', 'discount_price');
  `);

    console.log("\nFound Columns:");
    result.rows.forEach((row: any) => {
        console.log(`- ${row.column_name} (${row.data_type})`);
    });

    if (result.rows.length === 2) {
        console.log("\n✅ Verification SUCCESS: Both 'price' and 'discount_price' columns exist.");
    } else {
        console.log("\n❌ Verification FAILED: Missing columns.");
    }
    process.exit(0);
}

verifyColumns().catch(console.error);
