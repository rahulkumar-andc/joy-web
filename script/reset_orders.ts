
import "dotenv/config";
import { db } from "../server/db";
import { orders, orderItems, stockReservations, resellerCommissions } from "../shared/schema";
import { sql } from "drizzle-orm";

async function resetOrders() {
    console.log("⚠️ Wiping all orders for clean schema update...");
    try {
        // Delete in order of dependency
        await db.delete(resellerCommissions);
        await db.delete(stockReservations);
        await db.delete(orderItems);
        // Delete payments if they exist/linked? (payments table references orders)
        // Checking schema... payments has order_id FK.
        // Need to delete payments too.
        await db.execute(sql`DELETE FROM payments`);

        await db.delete(orders);

        console.log("✅ All orders and related data wiped.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to wipe orders:", error);
        process.exit(1);
    }
}

resetOrders();
