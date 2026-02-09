
import "dotenv/config";
import { db } from "../server/db";
import { categories } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Checking categories in database...");

    try {
        const cats = await db.select().from(categories);
        console.log(`Found ${cats.length} categories.`);

        // Check if ID 1 exists
        const cat1 = cats.find(c => c.id === 1);

        if (cat1) {
            console.log("✅ Category ID 1 exists:", cat1.name);
        } else {
            console.log("❌ Category ID 1 is MISSING. Attempting to create it...");

            // Try to create a category that might take ID 1
            // If the table is empty, the first insert will be ID 1
            // If it's not empty but ID 1 is missing, we might need to force it (not easy with serial)
            // Or just insert and see what ID we get.

            const [newCat] = await db.insert(categories).values({
                name: "General",
                slug: "general",
                description: "Default category for products",
                imageUrl: "https://placehold.co/400"
            }).returning();

            console.log(`Created new category with ID: ${newCat.id}`);

            if (newCat.id !== 1) {
                console.warn("⚠️ Created category did NOT get ID 1. The frontend logic relying on ID 1 might still fail.");
                console.warn("You may need to update 'AdminProducts.tsx' to use dynamic categories.");
            } else {
                console.log("✅ Successfully created Category ID 1.");
            }
        }
    } catch (error) {
        console.error("Error checking/seeding categories:", error);
    }

    process.exit(0);
}

main().catch(console.error);
