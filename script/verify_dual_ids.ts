
import "dotenv/config";
import { orderRepository } from "../server/repositories/orderRepository";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function verifyDualIds() {
    console.log("🧪 Verifying Dual Order ID System...");

    try {
        // 1. Ensure a user exists
        let user = await db.query.users.findFirst();
        if (!user) {
            console.log("Creating test user...");
            const [newUser] = await db.insert(users).values({
                password: "password",
                name: "Test User",
                email: "test_id@example.com",
                role: "user"
            }).returning();
            user = newUser;
        }

        // 2. Create Order 1
        console.log("Creating Order 1...");
        const order1 = await orderRepository.createOrder({
            userId: user.id,
            totalAmount: "100.00",
            shippingCost: "0",
            shippingAddress: {
                fullName: "Test User",
                addressLine1: "123 Test St",
                city: "Test City",
                state: "TC",
                zipCode: "12345",
                country: "Test Country",
                phone: "1234567890"
            },
            status: "pending",
            paymentStatus: "pending",
            orderState: "CREATED",
            stateVersion: 1,
            stateHistory: [],
            invoiceId: null,
            refundStatus: "none",
            codCollected: false,
            paymentSettled: false
        }, []);

        console.log("Order 1 Created:");
        console.log(`- ID: ${order1.id}`);
        console.log(`- Public ID: ${order1.publicOrderId}`);
        console.log(`- Internal ID: ${order1.internalOrderId}`);
        console.log(`- Sequence: ${order1.sequenceNumber}`);

        // 3. Create Order 2
        console.log("Creating Order 2...");
        const order2 = await orderRepository.createOrder({
            userId: user.id,
            totalAmount: "200.00",
            shippingCost: "0",
            shippingAddress: {}, // Minimal mock
            status: "pending",
            paymentStatus: "pending",
            orderState: "CREATED",
            stateVersion: 1,
            stateHistory: [],
            invoiceId: null,
            refundStatus: "none",
            codCollected: false,
            paymentSettled: false
        }, []);

        console.log("Order 2 Created:");
        console.log(`- Sequence: ${order2.sequenceNumber}`);
        console.log(`- Public ID: ${order2.publicOrderId}`);

        // 4. Verification Assertions
        const seq1 = order1.sequenceNumber;
        const seq2 = order2.sequenceNumber;

        if (seq2 !== seq1 + 1) throw new Error(`Sequence broken! ${seq1} -> ${seq2}`);
        if (!order1.publicOrderId?.startsWith("ORD-")) throw new Error("Public ID format mismatch");
        if (!order1.internalOrderId?.startsWith("ODR")) throw new Error("Internal ID format mismatch");

        console.log("✅ Dual ID Verification Passed!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Verification Failed:", error);
        process.exit(1);
    }
}

verifyDualIds();
