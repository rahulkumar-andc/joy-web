import "dotenv/config";
import { db } from "../server/db";
import { up as up0004 } from "../migrations/0004_payment_enhancements";
import { logger } from "../server/logger";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function runSQLMigration(filePath: string) {
    const fullPath = path.resolve(process.cwd(), filePath);
    const sqlContent = fs.readFileSync(fullPath, "utf8");
    logger.info(`Running SQL migration: ${path.basename(filePath)}`);
    await db.execute(sql.raw(sqlContent));
}

async function runMigration() {
    try {
        logger.info("Starting database migration...");

        // Existing TS migration
        await up0004(db);
        logger.info("✅ 0004_payment_enhancements completed.");

        // SQL Migrations
        await runSQLMigration("migrations/0005_stock_reservations.sql");
        await runSQLMigration("migrations/0006_user_security.sql");
        await runSQLMigration("migrations/0007_coupon_usage.sql");

        logger.info("Migration completed successfully.");
        process.exit(0);
    } catch (error) {
        logger.error("Migration failed:", error);
        process.exit(1);
    }
}

runMigration();
