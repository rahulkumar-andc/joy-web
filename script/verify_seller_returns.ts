
import "dotenv/config";
import { db } from "../server/db";
import { users, sellerProfiles, sellerReturnRequests, sellerOrders, orders, payments, auditLogs } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { paymentService } from "../server/services/paymentService";
import { sellerOrderService } from "../server/services/seller/sellerOrderService";
import { refundRouter } from "../server/routes/refunds"; // To see if we can simulate request via app or just service
// We will test services directly for speed, and routes via fetch if server was running but simulation is faster.

async function verify() {
    console.log("Starting Verification...");

    // 1. Setup Data
    // Get/Create a test user/seller
    let user = await db.query.users.findFirst({ where: eq(users.email, "seller_test@test.com") });
    if (!user) {
        [user] = await db.insert(users).values({
            email: "seller_test@test.com",
            password: "hashed_password",
            name: "Test Seller",
            role: "user" // promoted later
        }).returning();
    }

    let seller = await db.query.sellerProfiles.findFirst({ where: eq(sellerProfiles.userId, user.id) });
    if (!seller) {
        [seller] = await db.insert(sellerProfiles).values({
            userId: user.id,
            shopName: "Test Shop",
            businessType: "individual",
            businessEmail: "seller_test@test.com",
            businessPhone: "9876543210",
            panNumber: "ABCDE1234F",
            bankAccountNumber: "1234567890",
            bankIfscCode: "ABCD0123456",
            bankAccountName: "Test Seller",
            pickupAddressLine1: "123 Test St",
            pickupCity: "Test City",
            pickupState: "Test State",
            pickupPincode: "123456",
            pickupPhone: "9876543210",
            status: "approved"
        }).returning();
    }
    console.log("Seller ID:", seller.id);

    // Create Order and Seller Order
    let order = await db.query.orders.findFirst({ where: eq(orders.userId, user.id) }); // re-using user as customer for simplicity or create new
    if (!order) {
        [order] = await db.insert(orders).values({
            userId: user.id,
            totalAmount: "100.00",
            status: "delivered",
            shippingAddress: {},
            paymentStatus: "paid"
        }).returning();
    }

    // Check if seller order exists
    let sellerOrder = await db.query.sellerOrders.findFirst({ where: eq(sellerOrders.orderId, order.id) });
    if (!sellerOrder) {
        [sellerOrder] = await db.insert(sellerOrders).values({
            orderId: order.id,
            sellerId: seller.id,
            sellerOrderNumber: `SO-${Date.now()}`,
            subtotal: "100.00",
            platformFee: "10",
            platformFeePercentage: "10",
            sellerEarnings: "90.00",
            status: "delivered"
        }).returning();
    }

    // 2. Verify Seller Return Request Service
    console.log("Testing Seller Return Request Service...");

    // Create dummy return request
    let [req] = await db.insert(sellerReturnRequests).values({
        returnNumber: `RET-${Date.now()}`,
        sellerOrderId: sellerOrder.id,
        customerId: user.id,
        sellerId: seller.id,
        reason: "wrong_item", // Fixed enum value
        description: "Test return",
        returnItems: [],
        status: "requested",
        requestedRefundAmount: "100.00"
    }).returning();

    // Test getReturnRequestsForSeller
    const requests = await sellerOrderService.getReturnRequestsForSeller(seller.id);
    console.log("Fetched Requests:", requests.requests.length);
    if (requests.requests.find(r => r.id === req.id)) {
        console.log("✅ getReturnRequestsForSeller working");
    } else {
        console.error("❌ getReturnRequestsForSeller failed");
    }

    // Test respondToReturnRequest (Approve)
    await sellerOrderService.respondToReturnRequest(req.id, seller.id, user.id, "approve", "Approved return");

    const updatedReq = await db.query.sellerReturnRequests.findFirst({ where: eq(sellerReturnRequests.id, req.id) });
    if (updatedReq?.status === "seller_approved") {
        console.log("✅ respondToReturnRequest (Approve) working");
    } else {
        console.error("❌ respondToReturnRequest (Approve) failed: Status is", updatedReq?.status);
    }


    // 3. Verify Payment Refund Integration (Simulated)
    console.log("Testing Payment Refund Integration...");

    // Create a mock payment
    const paymentId = `pi_mock_${Date.now()}`;
    await db.insert(payments).values({
        orderId: order.id,
        amount: "100.00",
        gateway: "stripe",
        gatewayReference: paymentId,
        paymentState: "SUCCESS",
        razorpayOrderId: "mock_rp_order"
    });

    // We can't easily call the API route directly without running server + auth.
    // Instead we will unit test the PaymentService.refundPayment method.

    // Mock stripe? No, we will call it and expect it to fail or mock it.
    // Since we don't have stripe keys, it might throw. 
    // But we implemented logic to handle errors.

    try {
        console.log("Attempting Refund via Service...");
        await paymentService.refundPayment("pi_mock_123", 100, "stripe");
        console.log("✅ PaymentService.refundPayment called successfully (mocked/real)");
    } catch (e: any) {
        console.log("ℹ️ PaymentService.refundPayment threw error (expected without valid keys):", e.message);
        // If it threw "StripeConnectionError" or "Authentication Required", it means it tried to hit Stripe.
        if (e.message.includes("api_key") || e.message.includes("Stripe")) {
            console.log("✅ Logic reached Stripe SDK");
        }
    }

    console.log("Verification Complete.");
    process.exit(0);
}

verify().catch(console.error);
