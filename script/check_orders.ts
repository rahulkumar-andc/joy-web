import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkOrders() {
    try {
        // Check total orders
        const count = await db.execute(sql`SELECT COUNT(*) as total FROM orders`);
        console.log("Total orders:", count.rows[0]);

        // Get recent orders
        const orders = await db.execute(sql`
      SELECT id, order_id, user_id, status, total, created_at 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
        console.log("\nRecent orders:");
        console.table(orders.rows);

    } catch (error) {
        console.error("Error:", error);
    }
    process.exit(0);
}
checkOrders();
