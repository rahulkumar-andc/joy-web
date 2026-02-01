import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users } from "./schema";

// ============================================================================
// RBAC SCHEMA - Enterprise Role-Based Access Control
// ============================================================================

/**
 * Roles table - Dynamic role definitions with hierarchy
 * Lower hierarchy_level = more privileged (1 = SUPER_ADMIN)
 */
export const roles = pgTable("roles", {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    displayName: text("display_name").notNull(),
    description: text("description"),
    hierarchyLevel: integer("hierarchy_level").notNull().default(100), // Lower = more privileged
    scopeType: text("scope_type", {
        enum: ["global", "vertical", "region", "seller"]
    }).default("global").notNull(),
    isSystemRole: boolean("is_system_role").default(false).notNull(), // Cannot be deleted
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Permissions table - Domain + Action + Resource model
 * Example: { domain: "orders", action: "refund", resource: "high_value" }
 */
export const permissions = pgTable("permissions", {
    id: serial("id").primaryKey(),
    domain: text("domain").notNull(), // orders, catalog, refunds, sellers, system
    action: text("action").notNull(),  // read, create, update, delete, approve
    resource: text("resource"),        // Optional: specific resource type (e.g., "high_value_refund")
    description: text("description"),
    constraintKey: text("constraint_key"), // Optional: amount_limit, region, category_id
    createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Role-Permission mapping with optional constraints
 */
export const rolePermissions = pgTable("role_permissions", {
    id: serial("id").primaryKey(),
    roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
    permissionId: integer("permission_id").references(() => permissions.id, { onDelete: "cascade" }).notNull(),
    constraintValue: text("constraint_value"), // e.g., "5000" for amount_limit
    requiresApproval: boolean("requires_approval").default(false).notNull(),
    approvalRoleId: integer("approval_role_id").references(() => roles.id), // Who can approve
    createdAt: timestamp("created_at").defaultNow(),
});

/**
 * User-Role assignment with scoping for isolation
 * Supports: global roles, vertical-specific, region-specific, seller-specific
 */
export const userRoles = pgTable("user_roles", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
    scopeType: text("scope_type", {
        enum: ["global", "vertical", "region", "seller"]
    }).default("global").notNull(),
    scopeValue: text("scope_value"), // e.g., "electronics", "north", seller_id
    grantedBy: integer("granted_by").references(() => users.id),
    grantedAt: timestamp("granted_at").defaultNow(),
    expiresAt: timestamp("expires_at"), // For temporary elevation
    isActive: boolean("is_active").default(true).notNull(),
});

/**
 * Enhanced Audit Logs - Immutable action tracking
 */
export const rbacAuditLogs = pgTable("rbac_audit_logs", {
    id: serial("id").primaryKey(),
    actorId: integer("actor_id").references(() => users.id),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    domain: text("domain").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    metadata: jsonb("metadata"), // IP, user-agent, request_id
    approvalId: integer("approval_id"),
    status: text("status", { enum: ["success", "denied", "error"] }).default("success").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Approval Queue - For actions requiring dual approval
 */
export const approvalRequests = pgTable("approval_requests", {
    id: serial("id").primaryKey(),
    requesterId: integer("requester_id").references(() => users.id).notNull(),
    action: text("action").notNull(),
    domain: text("domain").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    payload: jsonb("payload").notNull(),
    status: text("status", {
        enum: ["pending", "approved", "rejected", "expired"]
    }).default("pending").notNull(),
    approvedBy: integer("approved_by").references(() => users.id),
    rejectionReason: text("rejection_reason"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
    resolvedAt: timestamp("resolved_at"),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const rolesRelations = relations(roles, ({ many }) => ({
    rolePermissions: many(rolePermissions),
    userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
    rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
    role: one(roles, {
        fields: [rolePermissions.roleId],
        references: [roles.id],
    }),
    permission: one(permissions, {
        fields: [rolePermissions.permissionId],
        references: [permissions.id],
    }),
    approvalRole: one(roles, {
        fields: [rolePermissions.approvalRoleId],
        references: [roles.id],
    }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
    user: one(users, {
        fields: [userRoles.userId],
        references: [users.id],
    }),
    role: one(roles, {
        fields: [userRoles.roleId],
        references: [roles.id],
    }),
    grantedByUser: one(users, {
        fields: [userRoles.grantedBy],
        references: [users.id],
    }),
}));

export const approvalRequestsRelations = relations(approvalRequests, ({ one }) => ({
    requester: one(users, {
        fields: [approvalRequests.requesterId],
        references: [users.id],
    }),
    approver: one(users, {
        fields: [approvalRequests.approvedBy],
        references: [users.id],
    }),
}));

// ============================================================================
// INSERT SCHEMAS
// ============================================================================

export const insertRoleSchema = createInsertSchema(roles).omit({
    id: true, createdAt: true, updatedAt: true
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
    id: true, createdAt: true
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
    id: true, createdAt: true
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
    id: true, grantedAt: true
});

export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({
    id: true, createdAt: true, resolvedAt: true, status: true
});

export const insertRbacAuditLogSchema = createInsertSchema(rbacAuditLogs).omit({
    id: true, createdAt: true
});

// ============================================================================
// TYPES
// ============================================================================

export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;

export type RbacAuditLog = typeof rbacAuditLogs.$inferSelect;
export type InsertRbacAuditLog = z.infer<typeof insertRbacAuditLogSchema>;

// ============================================================================
// PERMISSION DOMAINS & ACTIONS (Enums for type safety)
// ============================================================================

export const PermissionDomains = {
    SYSTEM: "system",
    USERS: "users",
    ROLES: "roles",
    CATALOG: "catalog",
    ORDERS: "orders",
    REFUNDS: "refunds",
    SELLERS: "sellers",
    FINANCE: "finance",
    REPORTS: "reports",
} as const;

export const PermissionActions = {
    READ: "read",
    CREATE: "create",
    UPDATE: "update",
    DELETE: "delete",
    APPROVE: "approve",
    MANAGE: "manage", // Full CRUD
} as const;

export type PermissionDomain = typeof PermissionDomains[keyof typeof PermissionDomains];
export type PermissionAction = typeof PermissionActions[keyof typeof PermissionActions];
