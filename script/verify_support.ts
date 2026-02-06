
import "dotenv/config";
import { supportRepository } from "../server/repositories/supportRepository";
import { db } from "../server/db";
import { users } from "../shared/schema";

async function verifySupport() {
    console.log("🧪 Verifying Support Ticket System...");

    try {
        // 1. Ensure a user exists
        let user = await db.query.users.findFirst();
        if (!user) {
            console.log("Creating test user...");
            const [newUser] = await db.insert(users).values({
                password: "password",
                name: "Support Tester",
                email: "support@test.com",
                role: "user"
            }).returning();
            user = newUser;
        }

        // 2. Create Test Ticket
        console.log("Creating Test Ticket...");
        const ticket = await supportRepository.createTicket({
            userId: user.id,
            orderId: null,
            productId: null,
            issueType: "delivery_late",
            subject: "My order is delayed",
            description: "I placed an order 5 days ago but it has not arrived yet.",
        });

        console.log("Ticket Created:");
        console.log(`- Ticket ID: ${ticket.ticketId}`);
        console.log(`- Status: ${ticket.status}`);
        console.log(`- Priority: ${ticket.priority}`);
        console.log(`- Team: ${ticket.assignedTeam}`);

        // 3. Add a message
        console.log("Adding a message...");
        const message = await supportRepository.addMessage({
            ticketId: ticket.id,
            senderType: "user",
            senderId: user.id,
            message: "Please help me track my order.",
        });
        console.log(`- Message ID: ${message.id}`);

        // 4. Verify format
        if (!ticket.ticketId.startsWith("TKT-")) throw new Error("Ticket ID format mismatch");
        if (ticket.status !== "OPEN") throw new Error("Status should be OPEN");
        if (ticket.priority !== "MEDIUM") throw new Error("Priority should be MEDIUM for delivery_late");

        console.log("✅ Support Ticket System Verification Passed!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Verification Failed:", error);
        process.exit(1);
    }
}

verifySupport();
