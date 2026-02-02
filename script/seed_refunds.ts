import "dotenv/config";
import { db } from "../server/db";
import { users, orders, refunds } from "../shared/schema";
import { sellerProfiles, sellerOrders, sellerReturnRequests } from "../shared/seller-schema";
import { eq } from "drizzle-orm";

async function run() {
    console.log("Starting seed...");

    // 1. Get/Create Customer
    let customer = await db.query.users.findFirst({ where: eq(users.email, "customer_seed@example.com") });
    if (!customer) {
        [customer] = await db.insert(users).values({
            email: "customer_seed@example.com",
            password: "hashed_dummy",
            name: "Seed Customer",
            role: "user",
            isVerified: true,
            // phone/address optional
        }).returning();
    }

    // 2. Get/Create Seller
    let sellerUser = await db.query.users.findFirst({ where: eq(users.email, "seller_seed@example.com") });
    if (!sellerUser) {
        [sellerUser] = await db.insert(users).values({
            email: "seller_seed@example.com",
            password: "hashed_dummy",
            name: "Seed Seller",
            role: "user", // Will become seller via profile
            isVerified: true
        }).returning();
    }

    let seller = await db.query.sellerProfiles.findFirst({ where: eq(sellerProfiles.userId, sellerUser.id) });
    if (!seller) {
        [seller] = await db.insert(sellerProfiles).values({
            userId: sellerUser.id,
            shopName: "Seed Shop",
            businessType: "individual", // Required param
            businessEmail: "seller_seed@example.com",
            businessPhone: "9876543210", // Updated to valid-ish
            pickupAddressLine1: "123 Street",
            pickupCity: "City",
            pickupState: "State",
            pickupPincode: "123456",
            pickupPhone: "9876543210",
            panNumber: "ABCDE1234F",
            bankAccountNumber: "123456789",
            bankIfscCode: "ABCD0123456",
            bankAccountName: "Seller Name",
            status: "approved"
        }).returning();
    }

    // 3. Create Order
    const [order] = await db.insert(orders).values({
        userId: customer.id,
        totalAmount: "100",
        status: "delivered",
        // paymentMethod removed
        shippingAddress: {
            fullName: "Seed Customer",
            addressLine1: "123 Main St",
            city: "City",
            state: "State",
            zipCode: "12345",
            country: "Country"
        }
    }).returning();

    // 4. Create Seller Order
    const [sellerOrder] = await db.insert(sellerOrders).values({
        orderId: order.id,
        sellerId: seller.id,
        sellerOrderNumber: `SO-SEED-${Date.now()}`,
        subtotal: "100",
        platformFee: "10",
        platformFeePercentage: "10",
        sellerEarnings: "90",
        status: "delivered",
        payoutStatus: "pending",
        stateHistory: []
    }).returning();

    // 5. Create Refund Request
    await db.insert(refunds).values({
        orderId: order.id,
        userId: customer.id,
        reason: "defective",
        description: "Seed refund request pending",
        amount: "50",
        status: "pending",
        refundMethod: "original"
    });

    // 6. Create Return Request (Dispute)
    await db.insert(sellerReturnRequests).values({
        returnNumber: `RET-SEED-${Date.now()}`,
        sellerOrderId: sellerOrder.id,
        customerId: customer.id,
        sellerId: seller.id,
        reason: "wrong_item",
        description: "Seed dispute",
        returnItems: [{ itemId: 1, quantity: 1 }],
        status: "admin_review",
        sellerResponse: "I reject this!",
        requestedRefundAmount: "100"
    });

    console.log("Seeding complete. Refund & Dispute created.");
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
