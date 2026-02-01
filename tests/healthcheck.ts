import { Pool } from "pg";
import { Redis } from "@upstash/redis";
import ImageKit from "imagekit";
import "dotenv/config";

// ---------- PostgreSQL ----------
const pg = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
});

// ---------- Redis ----------
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ---------- ImageKit ----------
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
});

async function checkPostgres() {
    try {
        const res = await pg.query("SELECT NOW() as time");
        console.log("✅ PostgreSQL OK:", res.rows[0].time);
    } catch (err) {
        console.error("❌ PostgreSQL FAILED:", err);
    }
}

async function checkRedis() {
    try {
        await redis.set("health:test", "alive", { ex: 10 });
        const value = await redis.get("health:test");
        console.log("✅ Redis OK:", value);
    } catch (err) {
        console.error("❌ Redis FAILED:", err);
    }
}

async function checkImageKit() {
    try {
        const result = await imagekit.upload({
            file: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=",
            fileName: "healthcheck.png",
            folder: "/health",
        });

        console.log("✅ ImageKit OK:", result.url);
    } catch (err) {
        console.error("❌ ImageKit FAILED:", err);
    }
}

async function run() {
    console.log("🔍 Running system health check...\n");

    await checkPostgres();
    await checkRedis();
    await checkImageKit();

    await pg.end();
}

run();
