import 'dotenv/config';
import { db } from "../server/db";
import { users } from "@shared/schema";
import { sellerProfiles, sellerWallets } from "@shared/seller-schema";
import { eq } from "drizzle-orm";

async function createSellerProfiles() {
    console.log("Finding users with seller role...\n");

    const sellerUsers = await db.query.users.findMany({
        where: eq(users.role, 'seller'),
        columns: { id: true, email: true, name: true }
    });

    console.log(`Found ${sellerUsers.length} users with seller role:`);
    sellerUsers.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`));

    for (const user of sellerUsers) {
        // Check if seller profile already exists
        const existingProfile = await db.query.sellerProfiles.findFirst({
            where: eq(sellerProfiles.userId, user.id)
        });

        if (existingProfile) {
            console.log(`\n✓ ${user.email} already has seller profile (Shop: ${existingProfile.shopName})`);
            continue;
        }

        console.log(`\n📦 Creating seller profile for ${user.email}...`);

        // Generate unique shop name from user email
        const shopName = `${user.name || user.email.split('@')[0]}'s Store`;

        // Create seller profile with approved status
        const [newProfile] = await db.insert(sellerProfiles).values({
            userId: user.id,
            shopName: shopName,
            businessType: 'individual',
            description: 'Welcome to my store!',
            businessEmail: user.email,
            businessPhone: '9876543210',
            panNumber: 'AAAAA0000A',
            bankAccountNumber: '123456789012',
            bankIfscCode: 'HDFC0001234',
            bankAccountName: user.name || 'Account Holder',
            bankName: 'HDFC Bank',
            pickupAddressLine1: '123 Main Street',
            pickupCity: 'New Delhi',
            pickupState: 'Delhi',
            pickupPincode: '110001',
            pickupPhone: '9876543210',
            status: 'approved', // Pre-approved for testing
        }).returning();

        console.log(`   ✅ Created profile: ${shopName} (ID: ${newProfile.id})`);

        // Create seller wallet
        await db.insert(sellerWallets).values({
            sellerId: newProfile.id,
            minPayoutAmount: '100',
        });

        console.log(`   💰 Created wallet for seller`);
    }

    console.log("\n✅ Seller profiles setup complete!");
    process.exit(0);
}

createSellerProfiles().catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
});
