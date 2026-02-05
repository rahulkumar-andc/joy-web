import "dotenv/config";
import { db } from "../server/db";
import { up as up0004 } from "../migrations/0004_payment_enhancements";
import { logger } from "../server/logger";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

/**
 * Production-ready migration script
 * Runs all SQL migrations in order with idempotent checks
 */

async function runSQLMigration(filePath: string) {
    const fullPath = path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
        logger.warn(`Migration file not found, skipping: ${filePath}`);
        return;
    }

    const sqlContent = fs.readFileSync(fullPath, "utf8");
    const migrationName = path.basename(filePath);

    logger.info(`Running SQL migration: ${migrationName}`);

    try {
        await db.execute(sql.raw(sqlContent));
        logger.info(`✅ ${migrationName} completed.`);
    } catch (error: unknown) {
        const err = error as Error;
        // Check for "already exists" errors - these are safe to ignore
        if (err.message?.includes('already exists') ||
            err.message?.includes('duplicate key') ||
            err.message?.includes('relation') && err.message?.includes('already exists')) {
            logger.warn(`⚠️ ${migrationName} - Objects already exist, skipping.`);
        } else {
            throw error;
        }
    }
}

async function runMigration() {
    try {
        logger.info("=".repeat(60));
        logger.info("Starting database migration...");
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info("=".repeat(60));

        // TypeScript migrations
        logger.info("\n📦 Running TypeScript migrations...");
        await up0004(db);
        logger.info("✅ 0004_payment_enhancements completed.");

        // SQL Migrations - Run in order
        logger.info("\n📂 Running SQL migrations...");

        const sqlMigrations = [
            "migrations/0000_opposite_husk.sql",
            "migrations/0001_campaign_ab_testing_scheduling.sql",
            "migrations/0002_audit_check.sql",
            "migrations/0005_stock_reservations.sql",
            "migrations/0006_user_security.sql",
            "migrations/0007_coupon_usage.sql",
            "migrations/0008_performance_indexes.sql",
            "migrations/0008_reseller_system.sql",
            "migrations/0009_order_reseller_attribution.sql",
            "migrations/0010_audit_logs_indexes.sql",
            "migrations/0011_shipping_settings.sql",
            "migrations/0012_shipping_enhancements.sql",
            "migrations/0013_seller_marketplace.sql",
            "migrations/0014_estimated_delivery_date.sql",
            "migrations/0015_push_subscriptions.sql",
            "migrations/0016_add_cod_support.sql",
            "migrations/0017_create_feature_flags.sql",
            "migrations/0018_product_moderation_default.sql",
            "migrations/0019_delivery_system.sql",
        ];

        for (const migration of sqlMigrations) {
            await runSQLMigration(migration);
        }

        logger.info("\n" + "=".repeat(60));
        logger.info("🎉 All migrations completed successfully!");
        logger.info("=".repeat(60));
        process.exit(0);
    } catch (error) {
        logger.error("\n❌ Migration failed:", error);
        logger.error("Please check the error above and fix any issues before retrying.");
        process.exit(1);
    }
}

runMigration();
