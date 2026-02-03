import 'dotenv/config';
import { cacheService } from "../server/cache";
import { logger } from "../server/logger";

async function main() {
    console.log("Flushing cache...");
    await cacheService.flush();
    console.log("Cache flushed successfully.");
    process.exit(0);
}

main().catch(console.error);
