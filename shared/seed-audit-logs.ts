/**
 * Seed script to generate sample RBAC audit logs for testing
 */
import { db } from "../server/db";
import { rbacAuditLogs } from "../shared/rbac-schema";

// Use existing user IDs: 5, 6, 8 (admin), 10
const sampleLogs = [
    // Successful role assignments
    { actorId: 8, actorRole: "admin", domain: "roles", action: "assign", resourceType: "user", resourceId: "5", status: "success" as const, metadata: { roleId: 3, roleName: "Product Manager" } },
    { actorId: 8, actorRole: "admin", domain: "roles", action: "assign", resourceType: "user", resourceId: "6", status: "success" as const, metadata: { roleId: 4, roleName: "Content Manager" } },
    { actorId: 8, actorRole: "admin", domain: "roles", action: "revoke", resourceType: "user", resourceId: "10", status: "success" as const, metadata: { roleId: 5, roleName: "Support Agent" } },

    // Permission checks
    { actorId: 5, actorRole: "manager", domain: "products", action: "update", resourceType: "product", resourceId: "42", status: "success" as const, metadata: { field: "price" } },
    { actorId: 10, actorRole: "customer", domain: "orders", action: "delete", resourceType: "order", resourceId: "123", status: "denied" as const, errorMessage: "Insufficient permissions" },
    { actorId: 6, actorRole: "support", domain: "refunds", action: "approve", resourceType: "refund", resourceId: "89", status: "success" as const },

    // Denied access attempts
    { actorId: 10, actorRole: "customer", domain: "admin", action: "access", resourceType: "dashboard", resourceId: null, status: "denied" as const, errorMessage: "Admin access required" },
    { actorId: 5, actorRole: "user", domain: "users", action: "delete", resourceType: "user", resourceId: "6", status: "denied" as const, errorMessage: "Cannot delete other users" },
    { actorId: 6, actorRole: "support", domain: "roles", action: "assign", resourceType: "user", resourceId: "5", status: "denied" as const, errorMessage: "Role management requires admin" },

    // Elevation requests
    { actorId: 8, actorRole: "admin", domain: "elevation", action: "request", resourceType: "user", resourceId: "5", status: "success" as const, metadata: { roleId: 2, durationHours: 4, reason: "Emergency production fix" } },
    { actorId: 8, actorRole: "admin", domain: "elevation", action: "grant", resourceType: "user", resourceId: "5", status: "success" as const, metadata: { roleId: 2, expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() } },
    { actorId: 8, actorRole: "admin", domain: "elevation", action: "revoke", resourceType: "user", resourceId: "6", status: "success" as const, metadata: { reason: "Task completed" } },

    // Approval workflow
    { actorId: 8, actorRole: "admin", domain: "approvals", action: "approve", resourceType: "approval", resourceId: "7", status: "success" as const },
    { actorId: 8, actorRole: "admin", domain: "approvals", action: "reject", resourceType: "approval", resourceId: "9", status: "success" as const, metadata: { reason: "Insufficient justification" } },

    // Error scenarios
    { actorId: 8, actorRole: "admin", domain: "users", action: "update", resourceType: "user", resourceId: "999", status: "error" as const, errorMessage: "User not found" },
    { actorId: null, actorRole: null, domain: "system", action: "cleanup", resourceType: "elevations", resourceId: null, status: "success" as const, metadata: { cleaned: 3 } },

    // More variety
    { actorId: 8, actorRole: "admin", domain: "products", action: "create", resourceType: "product", resourceId: "150", status: "success" as const },
    { actorId: 8, actorRole: "admin", domain: "products", action: "update", resourceType: "product", resourceId: "150", status: "success" as const },
    { actorId: 5, actorRole: "manager", domain: "orders", action: "view", resourceType: "order", resourceId: "500", status: "success" as const },
    { actorId: 10, actorRole: "user", domain: "products", action: "view", resourceType: "product", resourceId: "42", status: "success" as const },
];

async function seedAuditLogs() {
    console.log("🔍 Seeding RBAC audit logs...");

    // Create logs with timestamps spread over the last 24 hours
    const now = Date.now();
    for (let i = 0; i < sampleLogs.length; i++) {
        const log = sampleLogs[i];
        const hoursAgo = Math.floor((sampleLogs.length - i) * (24 / sampleLogs.length));
        const createdAt = new Date(now - hoursAgo * 60 * 60 * 1000);

        await db.insert(rbacAuditLogs).values({
            actorId: log.actorId,
            actorRole: log.actorRole,
            domain: log.domain,
            action: log.action,
            resourceType: log.resourceType,
            resourceId: log.resourceId,
            status: log.status,
            errorMessage: log.errorMessage || null,
            metadata: log.metadata || null,
            createdAt,
        });
    }

    console.log(`✅ Created ${sampleLogs.length} sample audit logs`);
    process.exit(0);
}

seedAuditLogs().catch((err) => {
    console.error("❌ Failed to seed audit logs:", err);
    process.exit(1);
});
