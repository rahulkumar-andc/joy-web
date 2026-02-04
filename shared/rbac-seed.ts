import "dotenv/config";
import { db } from "../server/db";
import { roles, permissions, rolePermissions, InsertRole, InsertPermission } from "./rbac-schema";
import { PermissionDomains, PermissionActions } from "./rbac-schema";

// ============================================================================
// RBAC SEED DATA - Default roles and permissions
// ============================================================================

const DEFAULT_ROLES: InsertRole[] = [
    {
        name: "SUPER_ADMIN",
        displayName: "Super Admin",
        description: "Platform owner with full system access",
        hierarchyLevel: 1,
        scopeType: "global",
        isSystemRole: true,
        isActive: true,
    },
    {
        name: "BUSINESS_ADMIN",
        displayName: "Business Admin",
        description: "Category/vertical management and seller onboarding",
        hierarchyLevel: 10,
        scopeType: "vertical",
        isSystemRole: true,
        isActive: true,
    },
    {
        name: "OPS_ADMIN",
        displayName: "Operations Admin",
        description: "Warehouse, logistics, and fulfillment ops",
        hierarchyLevel: 10,
        scopeType: "region",
        isSystemRole: true,
        isActive: true,
    },
    {
        name: "SUPPORT_ADMIN",
        displayName: "Support Admin",
        description: "Escalation handling and high-value refund approvals",
        hierarchyLevel: 20,
        scopeType: "global",
        isSystemRole: true,
        isActive: true,
    },
    {
        name: "CATEGORY_MANAGER",
        displayName: "Category Manager",
        description: "Daily catalog operations within assigned category",
        hierarchyLevel: 30,
        scopeType: "vertical",
        isSystemRole: true,
        isActive: true,
    },
    {
        name: "OPS_MANAGER",
        displayName: "Operations Manager",
        description: "Daily logistics and delivery operations",
        hierarchyLevel: 30,
        scopeType: "region",
        isSystemRole: true,
        isActive: true,
    },
    {
        name: "SUPPORT_AGENT",
        displayName: "Support Agent",
        description: "L1/L2 customer support with limited refund authority",
        hierarchyLevel: 40,
        scopeType: "global",
        isSystemRole: true,
        isActive: true,
    },
    {
        name: "SELLER_ADMIN",
        displayName: "Seller Admin",
        description: "Vendor account owner",
        hierarchyLevel: 50,
        scopeType: "seller",
        isSystemRole: true,
        isActive: true,
    },
    {
        name: "SELLER_MANAGER",
        displayName: "Seller Manager",
        description: "Seller catalog and order management",
        hierarchyLevel: 60,
        scopeType: "seller",
        isSystemRole: true,
        isActive: true,
    },
    {
        name: "DELIVERY_PARTNER",
        displayName: "Delivery Partner",
        description: "In-house courier for order pickups and deliveries",
        hierarchyLevel: 80,
        scopeType: "region",
        isSystemRole: true,
        isActive: true,
    },
    {
        name: "USER",
        displayName: "User",
        description: "Regular platform user",
        hierarchyLevel: 100,
        scopeType: "global",
        isSystemRole: true,
        isActive: true,
    },
];

const DEFAULT_PERMISSIONS: InsertPermission[] = [
    // System
    { domain: "system", action: "read", description: "View system configuration" },
    { domain: "system", action: "manage", description: "Full system administration" },

    // Users
    { domain: "users", action: "read", description: "View user profiles" },
    { domain: "users", action: "create", description: "Create new users" },
    { domain: "users", action: "update", description: "Update user profiles" },
    { domain: "users", action: "delete", description: "Delete users" },
    { domain: "users", action: "manage", description: "Full user management" },

    // Roles
    { domain: "roles", action: "read", description: "View roles and permissions" },
    { domain: "roles", action: "assign", description: "Assign roles to users" },
    { domain: "roles", action: "revoke", description: "Revoke roles from users" },
    { domain: "roles", action: "manage", description: "Full role management" },

    // Catalog
    { domain: "catalog", action: "read", description: "View products and categories" },
    { domain: "catalog", action: "create", description: "Create products" },
    { domain: "catalog", action: "update", description: "Update products" },
    { domain: "catalog", action: "delete", description: "Delete products" },
    { domain: "catalog", action: "approve", description: "Approve product listings" },
    { domain: "catalog", action: "manage", description: "Full catalog management" },

    // Orders
    { domain: "orders", action: "read", description: "View orders" },
    { domain: "orders", action: "update", description: "Update order status" },
    { domain: "orders", action: "cancel", description: "Cancel orders" },
    { domain: "orders", action: "manage", description: "Full order management" },

    // Refunds
    { domain: "refunds", action: "read", description: "View refund requests" },
    { domain: "refunds", action: "create", description: "Create refund requests" },
    { domain: "refunds", action: "approve", resource: "low_value", description: "Approve refunds < ₹500", constraintKey: "amount_limit" },
    { domain: "refunds", action: "approve", resource: "medium_value", description: "Approve refunds ₹500-₹5000", constraintKey: "amount_limit" },
    { domain: "refunds", action: "approve", resource: "high_value", description: "Approve refunds > ₹5000", constraintKey: "amount_limit" },
    { domain: "refunds", action: "manage", description: "Full refund management" },

    // Sellers
    { domain: "sellers", action: "read", description: "View seller information" },
    { domain: "sellers", action: "onboard", description: "Onboard new sellers" },
    { domain: "sellers", action: "suspend", description: "Suspend seller accounts" },
    { domain: "sellers", action: "manage", description: "Full seller management" },

    // Finance
    { domain: "finance", action: "read", description: "View financial reports" },
    { domain: "finance", action: "settlement", description: "Process settlements" },
    { domain: "finance", action: "manage", description: "Full finance management" },

    // Reports
    { domain: "reports", action: "read", description: "View reports and analytics" },
    { domain: "reports", action: "export", description: "Export reports" },

    // Shipping
    { domain: "shipping", action: "read", description: "View shipping settings" },
    { domain: "shipping", action: "update", description: "Update shipping settings" },
    { domain: "shipping", action: "manage", description: "Full shipping management" },

    // Delivery (In-House Courier)
    { domain: "delivery", action: "read", description: "View assigned deliveries" },
    { domain: "delivery", action: "update", description: "Update delivery status" },
    { domain: "delivery", action: "assign", description: "Assign couriers to orders" },
    { domain: "delivery", action: "manage", description: "Full delivery management" },
];

// Role → Permission mappings
const ROLE_PERMISSION_MAP: Record<string, { domain: string; action: string; resource?: string; constraintValue?: string; requiresApproval?: boolean }[]> = {
    SUPER_ADMIN: [
        { domain: "system", action: "manage" },
        { domain: "users", action: "manage" },
        { domain: "roles", action: "manage" },
        { domain: "catalog", action: "manage" },
        { domain: "orders", action: "manage" },
        { domain: "refunds", action: "manage" },
        { domain: "sellers", action: "manage" },
        { domain: "finance", action: "manage" },
        { domain: "reports", action: "read" },
        { domain: "shipping", action: "manage" },
        { domain: "delivery", action: "manage" },
    ],
    BUSINESS_ADMIN: [
        { domain: "catalog", action: "manage" },
        { domain: "sellers", action: "onboard" },
        { domain: "sellers", action: "suspend" },
        { domain: "sellers", action: "read" },
        { domain: "reports", action: "read" },
        { domain: "shipping", action: "read" },
        { domain: "shipping", action: "update" },
    ],
    OPS_ADMIN: [
        { domain: "orders", action: "manage" },
        { domain: "reports", action: "read" },
        { domain: "delivery", action: "manage" },
        { domain: "delivery", action: "assign" },
    ],
    SUPPORT_ADMIN: [
        { domain: "orders", action: "read" },
        { domain: "refunds", action: "read" },
        { domain: "refunds", action: "approve", resource: "low_value", constraintValue: "500" },
        { domain: "refunds", action: "approve", resource: "medium_value", constraintValue: "5000" },
        { domain: "refunds", action: "approve", resource: "high_value", constraintValue: "50000", requiresApproval: true },
        { domain: "users", action: "read" },
    ],
    CATEGORY_MANAGER: [
        { domain: "catalog", action: "read" },
        { domain: "catalog", action: "update" },
        { domain: "catalog", action: "approve" },
        { domain: "sellers", action: "read" },
    ],
    OPS_MANAGER: [
        { domain: "orders", action: "read" },
        { domain: "orders", action: "update" },
        { domain: "delivery", action: "read" },
        { domain: "delivery", action: "assign" },
    ],
    SUPPORT_AGENT: [
        { domain: "orders", action: "read" },
        { domain: "refunds", action: "read" },
        { domain: "refunds", action: "create" },
        { domain: "refunds", action: "approve", resource: "low_value", constraintValue: "500" },
        { domain: "refunds", action: "approve", resource: "medium_value", constraintValue: "5000", requiresApproval: true },
    ],
    SELLER_ADMIN: [
        { domain: "catalog", action: "read" },
        { domain: "catalog", action: "create" },
        { domain: "catalog", action: "update" },
        { domain: "catalog", action: "delete" },
        { domain: "orders", action: "read" },
        { domain: "finance", action: "read" },
    ],
    SELLER_MANAGER: [
        { domain: "catalog", action: "read" },
        { domain: "catalog", action: "create" },
        { domain: "catalog", action: "update" },
        { domain: "orders", action: "read" },
    ],
    DELIVERY_PARTNER: [
        { domain: "delivery", action: "read" },
        { domain: "delivery", action: "update" },
        { domain: "orders", action: "read" },
    ],
    USER: [
        { domain: "catalog", action: "read" },
        { domain: "orders", action: "read" },
    ],
};

export async function seedRbac() {
    console.log("[RBAC Seed] Starting...");

    // 1. Insert roles
    console.log("[RBAC Seed] Inserting roles...");
    const insertedRoles = await db.insert(roles).values(DEFAULT_ROLES).onConflictDoNothing().returning();
    console.log(`[RBAC Seed] Inserted ${insertedRoles.length} roles`);

    // Get all roles (including existing ones)
    const allRoles = await db.select().from(roles);
    const roleMap = new Map(allRoles.map((r) => [r.name, r.id]));

    // 2. Insert permissions
    console.log("[RBAC Seed] Inserting permissions...");
    const insertedPerms = await db.insert(permissions).values(DEFAULT_PERMISSIONS).onConflictDoNothing().returning();
    console.log(`[RBAC Seed] Inserted ${insertedPerms.length} permissions`);

    // Get all permissions
    const allPerms = await db.select().from(permissions);
    const permMap = new Map(allPerms.map((p) => [`${p.domain}:${p.action}:${p.resource || ""}`, p.id]));

    // 3. Create role-permission mappings
    console.log("[RBAC Seed] Creating role-permission mappings...");
    let mappingCount = 0;

    for (const [roleName, perms] of Object.entries(ROLE_PERMISSION_MAP)) {
        const roleId = roleMap.get(roleName);
        if (!roleId) {
            console.warn(`[RBAC Seed] Role not found: ${roleName}`);
            continue;
        }

        for (const perm of perms) {
            const permKey = `${perm.domain}:${perm.action}:${perm.resource || ""}`;
            const permId = permMap.get(permKey);
            if (!permId) {
                console.warn(`[RBAC Seed] Permission not found: ${permKey}`);
                continue;
            }

            await db.insert(rolePermissions).values({
                roleId,
                permissionId: permId,
                constraintValue: perm.constraintValue || null,
                requiresApproval: perm.requiresApproval || false,
            }).onConflictDoNothing();

            mappingCount++;
        }
    }

    console.log(`[RBAC Seed] Created ${mappingCount} role-permission mappings`);
    console.log("[RBAC Seed] Complete!");
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedRbac()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
