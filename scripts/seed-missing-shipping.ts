
import "dotenv/config";
import { db } from "../server/db";
import { shippingSettings, ShippingSettingKeys } from "../shared/shipping-schema";
import { eq } from "drizzle-orm";

async function seedMissing() {
    console.log("Seeding missing ALWAYS_FREE_THRESHOLD...");

    // Check if exists
    const existing = await db.query.shippingSettings.findFirst({
        where: eq(shippingSettings.key, ShippingSettingKeys.ALWAYS_FREE_THRESHOLD)
    });

    if (existing) {
        console.log("Already exists.");
    } else {
        await db.insert(shippingSettings).values({
            key: ShippingSettingKeys.ALWAYS_FREE_THRESHOLD,
            value: "999",
            description: "Orders above this amount are ALWAYS free (High Value)",
            allowedValues: null,
            minRoleLevel: 1, // Super Admin
        });
        console.log("Inserted ALWAYS_FREE_THRESHOLD = 999");
    }
}

seedMissing()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
