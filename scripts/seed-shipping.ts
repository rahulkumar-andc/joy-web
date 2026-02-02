
import "dotenv/config";
import { db } from "../server/db";
import { shippingSettings, ShippingSettingKeys } from "../shared/shipping-schema";

async function seedShippingSettings() {
    console.log("Checking shipping settings...");

    const existing = await db.select().from(shippingSettings);
    console.log(`Found ${existing.length} settings.`);

    if (existing.length > 0) {
        console.log("Settings already exist. Skipping seed.");
        return;
    }

    console.log("Seeding default shipping settings...");

    const defaults = [
        {
            key: ShippingSettingKeys.FREE_SHIPPING_ENABLED,
            value: "true",
            description: "Enable/disable free shipping globally",
            allowedValues: ["true", "false"], // Boolean toggle
            minRoleLevel: 10, // Business Admin can toggle
        },
        {
            key: ShippingSettingKeys.DEFAULT_SHIPPING_COST,
            value: "40",
            description: "Base shipping cost when not free",
            allowedValues: null, // Free-form number
            minRoleLevel: 1, // Super Admin only
        },
        {
            key: ShippingSettingKeys.FREE_SHIPPING_THRESHOLD,
            value: "499",
            description: "Minimum order value for free shipping",
            allowedValues: ["199", "299", "499", "999"], // Business Admin restricted choices
            minRoleLevel: 10, // Business Admin can select from list
        },
        // Festive Mode
        {
            key: ShippingSettingKeys.FESTIVE_MODE_ENABLED,
            value: "false",
            description: "Enable festive shipping rules",
            allowedValues: ["true", "false"],
            minRoleLevel: 10,
        },
        {
            key: ShippingSettingKeys.FESTIVE_THRESHOLD,
            value: "299",
            description: "Lower threshold during festive mode",
            allowedValues: ["199", "299", "499"],
            minRoleLevel: 10,
        },
        // Global Override
        {
            key: ShippingSettingKeys.GLOBAL_FREE_SHIPPING_OVERRIDE,
            value: "false", // "false" or number string like "100"
            description: "Emergency override for all shipping costs",
            allowedValues: null,
            minRoleLevel: 1, // Super Admin only
        },
        // New Enhancements
        {
            key: ShippingSettingKeys.FESTIVE_START_DATE,
            value: "",
            description: "Start date for scheduled festive mode",
            allowedValues: null,
            minRoleLevel: 10,
        },
        {
            key: ShippingSettingKeys.FESTIVE_END_DATE,
            value: "",
            description: "End date for scheduled festive mode",
            allowedValues: null,
            minRoleLevel: 10,
        },
        {
            key: ShippingSettingKeys.NOTIFICATION_SLACK_WEBHOOK,
            value: "",
            description: "Slack webhook URL for alerts",
            allowedValues: null,
            minRoleLevel: 1,
        },
        {
            key: ShippingSettingKeys.NOTIFICATION_EMAIL,
            value: "",
            description: "Email address for alerts",
            allowedValues: null,
            minRoleLevel: 1,
        },
        {
            key: ShippingSettingKeys.NOTIFICATIONS_ENABLED,
            value: "false",
            description: "Enable/disable shipping alerts",
            allowedValues: ["true", "false"],
            minRoleLevel: 1,
        }
    ];

    await db.insert(shippingSettings).values(defaults);
    console.log("Seeded default settings.");
}

seedShippingSettings()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
