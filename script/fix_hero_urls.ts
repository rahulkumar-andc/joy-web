import "dotenv/config";
import { db } from "../server/db";
import { heroCampaigns } from "../shared/schema";
import { sql } from "drizzle-orm";

async function fixHeroUrls() {
    console.log("Checking for hero campaigns with hardcoded localhost URLs...");

    // Find records with localhost URL
    const campaigns = await db.select().from(heroCampaigns);
    let count = 0;

    for (const campaign of campaigns) {
        if (campaign.mediaUrl.includes("localhost:5000/uploads/")) {
            console.log(`Fixing campaign ID ${campaign.id}: ${campaign.mediaUrl}`);

            const newUrl = campaign.mediaUrl.replace(/https?:\/\/[^\/]+\/uploads\//, "/uploads/");

            await db.update(heroCampaigns)
                .set({ mediaUrl: newUrl })
                .where(sql`${heroCampaigns.id} = ${campaign.id}`);

            console.log(`-> Updated to: ${newUrl}`);
            count++;
        }
    }

    console.log(`Fixed ${count} campaigns.`);
    process.exit(0);
}

fixHeroUrls().catch(console.error);
