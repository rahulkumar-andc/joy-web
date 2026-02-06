/**
 * Verification Test for Enterprise Support System
 */

import "dotenv/config";
import { supportRepository } from "../server/repositories/supportRepository";
import { db } from "../server/db";
import { users, agentWorkload } from "../shared/schema";
import { eq } from "drizzle-orm";

async function verifyEnterpriseSupport() {
    console.log("🧪 Verifying Enterprise Support System...\n");

    try {
        // 1. Get or create test user
        let user = await db.query.users.findFirst();
        if (!user) {
            throw new Error("No users found in database");
        }
        console.log(`✅ Using user: ${user.email}`);

        // 2. Create ticket with SLA
        console.log("\n📝 Creating HIGH priority ticket (should have 12-hour SLA)...");
        const ticket = await supportRepository.createTicket({
            userId: user.id,
            orderId: null,
            productId: null,
            issueType: "damaged_product", // HIGH priority
            subject: "Enterprise Test - Damaged Product",
            description: "Testing SLA and audit logging.",
        }, user.id);

        console.log(`   Ticket ID: ${ticket.ticketId}`);
        console.log(`   Priority: ${ticket.priority}`);
        console.log(`   SLA Deadline: ${ticket.slaDeadline}`);
        console.log(`   SLA Breached: ${ticket.slaBreached}`);

        // Verify SLA deadline is ~12 hours from now
        const now = new Date();
        const deadline = new Date(ticket.slaDeadline!);
        const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        console.log(`   Hours until SLA: ${hoursUntilDeadline.toFixed(1)}`);

        if (hoursUntilDeadline < 11.5 || hoursUntilDeadline > 12.5) {
            throw new Error(`SLA deadline incorrect. Expected ~12 hours, got ${hoursUntilDeadline.toFixed(1)}`);
        }
        console.log("✅ SLA deadline correctly calculated");

        // 3. Check audit log
        console.log("\n📋 Checking audit log...");
        const auditLogs = await supportRepository.getTicketAuditLog(ticket.id);
        console.log(`   Found ${auditLogs.length} audit entries`);

        const createLog = auditLogs.find(l => l.actionType === "CREATED");
        if (!createLog) {
            throw new Error("CREATED action not logged");
        }
        console.log(`   ✅ CREATED action logged at ${createLog.createdAt}`);

        // 4. Test priority upgrade
        console.log("\n⬆️ Testing priority upgrade...");
        const upgraded = await supportRepository.upgradePriority(ticket.id, "TEST_UPGRADE", user.id);
        console.log(`   Old priority: HIGH`);
        console.log(`   New priority: ${upgraded?.priority}`);

        if (upgraded?.priority !== "CRITICAL") {
            throw new Error(`Priority upgrade failed. Expected CRITICAL, got ${upgraded?.priority}`);
        }
        console.log("✅ Priority upgrade working");

        // 5. Check audit log for priority change
        const auditLogs2 = await supportRepository.getTicketAuditLog(ticket.id);
        const priorityLog = auditLogs2.find(l => l.actionType === "PRIORITY_CHANGED");
        if (!priorityLog) {
            throw new Error("PRIORITY_CHANGED action not logged");
        }
        console.log(`   ✅ PRIORITY_CHANGED logged: ${priorityLog.oldValue} → ${priorityLog.newValue}`);

        // 6. Test agent workload registration
        console.log("\n👥 Testing agent workload...");
        await supportRepository.registerAgent(user.id, 15);

        const workload = await db.query.agentWorkload.findFirst({
            where: eq(agentWorkload.agentId, user.id)
        });

        if (!workload) {
            throw new Error("Agent workload not registered");
        }
        console.log(`   Agent ${user.id} registered with maxTickets: ${workload.maxActiveTickets}`);
        console.log("✅ Agent workload registration working");

        // 7. Test message with response time
        console.log("\n💬 Testing agent message (first response)...");
        await supportRepository.addMessage({
            ticketId: ticket.id,
            senderType: "agent",
            senderId: user.id,
            message: "Thank you for contacting support. We will investigate.",
            isInternal: false,
        });

        const updatedTicket = await supportRepository.getTicketById(ticket.id);
        console.log(`   First Response At: ${updatedTicket?.firstResponseAt}`);
        console.log(`   Response Time (mins): ${updatedTicket?.responseTimeMinutes}`);

        if (!updatedTicket?.firstResponseAt) {
            throw new Error("First response time not recorded");
        }
        console.log("✅ Response time tracking working");

        console.log("\n🎉 All Enterprise Support System verifications PASSED!");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ Verification Failed:", error);
        process.exit(1);
    }
}

verifyEnterpriseSupport();
