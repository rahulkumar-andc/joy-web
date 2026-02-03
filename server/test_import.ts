
import "dotenv/config";
import { db } from "@server/db";
import { logger } from "@server/logger";
import { heroService } from "./modules/hero/service";

console.log("HeroService imported:", !!heroService);

console.log("DB imported:", !!db);
console.log("Logger imported:", !!logger);
console.log("Success");
