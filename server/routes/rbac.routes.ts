import { Router, Request, Response } from "express";
import { db } from "../db";
import { eq, and, desc, isNull } from "drizzle-orm";
import {
    roles,
    permissions,
    userRoles,
    rolePermissions,
    insertUserRoleSchema,
    insertPermissionSchema,
    insertRolePermissionSchema,
    insertRoleSchema,
} from "@shared/rbac-schema";
import { PermissionTemplates } from "@shared/rbac-templates";
import { users } from "@shared/schema";
import { requireAuth } from "../middleware/auth";
import { requirePermission, restrictTo, auditAction } from "../middleware/rbac";
import { authorizationService } from "../services/authorization.service";
import { approvalService } from "../services/approval.service";
import { auditService } from "../services/audit.service";
import { z } from "zod";

const router = Router();

// Helper to safely get string param (Express params can be string | string[])
const getParam = (param: string | string[] | undefined): string => {
    if (Array.isArray(param)) return param[0] || "";
    return param || "";
};

// ============================================================================
// ROLES ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/rbac/roles
 * List all roles with their permissions
 */
router.get("/roles",
    requireAuth,
    restrictTo("admin", "manager"),
    async (req: Request, res: Response) => {
        try {
            const allRoles = await db
                .select({
                    id: roles.id,
                    name: roles.name,
                    displayName: roles.displayName,
                    description: roles.description,
                    hierarchyLevel: roles.hierarchyLevel,
                    scopeType: roles.scopeType,
                    isSystemRole: roles.isSystemRole,
                    isActive: roles.isActive,
                })
                .from(roles)
                .orderBy(roles.hierarchyLevel);

            res.json({ roles: allRoles });
        } catch (error) {
            console.error("[RBAC API] Error fetching roles:", error);
            res.status(500).json({ message: "Failed to fetch roles" });
        }
    }
);

/**
 * POST /api/admin/rbac/roles
 * Create a new role
 */
router.post("/roles",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        try {
            const data = insertRoleSchema.parse(req.body);

            const [newRole] = await db.insert(roles).values(data).returning();

            await auditService.logSuccess(req, "roles", "create", {
                resourceType: "role",
                resourceId: newRole.id.toString(),
                newValue: newRole,
            });

            res.status(201).json({ role: newRole });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: "Invalid input", errors: error.errors });
            } else {
                console.error("[RBAC API] Error creating role:", error);
                res.status(500).json({ message: "Failed to create role" });
            }
        }
    }
);

/**
 * POST /api/admin/rbac/roles/:roleId/clone
 * Clone an existing role with all its permissions
 */
router.post("/roles/:roleId/clone",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        const sourceRoleId = parseInt(getParam(req.params.roleId));

        try {
            const [sourceRole] = await db.select().from(roles).where(eq(roles.id, sourceRoleId));
            if (!sourceRole) return res.status(404).json({ message: "Role not found" });

            // Create new role
            // Only name needs to be unique.
            const newRoleName = `${sourceRole.name}_copy_${Date.now().toString().slice(-6)}`;
            const newDisplayName = `Copy of ${sourceRole.displayName}`;

            const { id: _, createdAt: __, updatedAt: ___, ...roleProps } = sourceRole;

            const [newRole] = await db.insert(roles).values({
                ...roleProps,
                name: newRoleName,
                displayName: newDisplayName,
                isSystemRole: false, // Clones are not system roles by default
            }).returning();

            // Clone permissions
            const sourcePerms = await db
                .select()
                .from(rolePermissions)
                .where(eq(rolePermissions.roleId, sourceRoleId));

            if (sourcePerms.length > 0) {
                await db.insert(rolePermissions).values(
                    sourcePerms.map(p => ({
                        roleId: newRole.id,
                        permissionId: p.permissionId,
                        constraintValue: p.constraintValue,
                        requiresApproval: p.requiresApproval,
                        approvalRoleId: p.approvalRoleId,
                    }))
                );
            }

            await auditService.logSuccess(req, "roles", "clone", {
                resourceType: "role",
                resourceId: newRole.id.toString(),
                newValue: newRole,
                metadata: { sourceRoleId },
            });

            res.status(201).json({ role: newRole });
        } catch (error) {
            console.error("[RBAC API] Error cloning role:", error);
            res.status(500).json({ message: "Failed to clone role" });
        }
    }
);

/**
 * PUT /api/admin/rbac/roles/:roleId
 * Update a role
 */
router.put("/roles/:roleId",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        const roleId = parseInt(getParam(req.params.roleId));

        try {
            const data = insertRoleSchema.partial().parse(req.body);

            // Get old value for audit
            const [oldRole] = await db.select().from(roles).where(eq(roles.id, roleId));
            if (!oldRole) return res.status(404).json({ message: "Role not found" });

            if (oldRole.isSystemRole) {
                // Prevent modifying critical fields of system roles
                if (data.name && data.name !== oldRole.name) {
                    return res.status(400).json({ message: "Cannot change name of system role" });
                }
            }

            const [updatedRole] = await db.update(roles).set({ ...data, updatedAt: new Date() }).where(eq(roles.id, roleId)).returning();

            await auditService.logSuccess(req, "roles", "update", {
                resourceType: "role",
                resourceId: roleId.toString(),
                oldValue: oldRole,
                newValue: updatedRole,
            });

            res.json({ role: updatedRole });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: "Invalid input", errors: error.errors });
            } else {
                console.error("[RBAC API] Error updating role:", error);
                res.status(500).json({ message: "Failed to update role" });
            }
        }
    }
);

/**
 * DELETE /api/admin/rbac/roles/:roleId
 * Delete a role
 */
router.delete("/roles/:roleId",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        const roleId = parseInt(getParam(req.params.roleId));

        try {
            // Get role
            const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
            if (!role) return res.status(404).json({ message: "Role not found" });

            if (role.isSystemRole) {
                return res.status(403).json({ message: "Cannot delete system role" });
            }

            await db.delete(roles).where(eq(roles.id, roleId));

            await auditService.logSuccess(req, "roles", "delete", {
                resourceType: "role",
                resourceId: roleId.toString(),
                oldValue: role,
            });

            res.status(204).send();
        } catch (error) {
            console.error("[RBAC API] Error deleting role:", error);
            res.status(500).json({ message: "Failed to delete role" });
        }
    }
);

/**
 * POST /api/admin/rbac/roles/:roleId/assignments
 * Bulk assign users to a role
 */
router.post("/roles/:roleId/assignments",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        const roleId = parseInt(getParam(req.params.roleId));
        const { userIds } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: "userIds array is required" });
        }

        try {
            const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
            if (!role) return res.status(404).json({ message: "Role not found" });

            const targetUserIds = userIds.map((id: any) => Number(id)).filter((n: number) => !isNaN(n));
            if (targetUserIds.length === 0) return res.status(400).json({ message: "No valid user IDs provided" });

            const results = { attached: 0, skipped: 0 };

            await db.transaction(async (tx) => {
                for (const userId of targetUserIds) {
                    const [exists] = await tx.select().from(userRoles)
                        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));

                    if (!exists) {
                        await tx.insert(userRoles).values({
                            userId,
                            roleId,
                            scopeType: "global",
                            grantedBy: (req.user as any)?.id,
                        });
                        results.attached++;
                    } else {
                        results.skipped++;
                    }
                }
            });

            await auditService.logSuccess(req, "roles", "bulk_assign", {
                resourceType: "role",
                resourceId: roleId.toString(),
                metadata: { ...results, userIds: targetUserIds },
            });

            res.status(201).json({ message: "Assignments completed", ...results });
        } catch (error) {
            console.error("[RBAC API] Error in bulk assignment:", error);
            res.status(500).json({ message: "Bulk assignment failed" });
        }
    }
);

/**
 * POST /api/admin/rbac/roles/:roleId/templates
 * Apply a permission template to a role
 */
router.post("/roles/:roleId/templates",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        const roleId = parseInt(getParam(req.params.roleId));
        const { templateId } = req.body;

        const template = PermissionTemplates.find(t => t.id === templateId);
        if (!template) return res.status(404).json({ message: "Template not found" });

        const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
        if (!role) return res.status(404).json({ message: "Role not found" });

        const results = { applied: 0 };

        try {
            await db.transaction(async (tx) => {
                for (const p of template.permissions) {
                    const permissionData = p as any;
                    // Find permission ID
                    let [perm] = await tx.select().from(permissions)
                        .where(and(
                            eq(permissions.domain, permissionData.domain),
                            eq(permissions.action, permissionData.action),
                            permissionData.resource ? eq(permissions.resource, permissionData.resource) : isNull(permissions.resource)
                        ));

                    // Create if missing
                    if (!perm) {
                        [perm] = await tx.insert(permissions).values({
                            domain: permissionData.domain,
                            action: permissionData.action,
                            resource: permissionData.resource || null,
                            description: `Auto-created from template ${template.name}`
                        }).returning();
                    }

                    // Assign to role
                    const [exists] = await tx.select().from(rolePermissions)
                        .where(and(
                            eq(rolePermissions.roleId, roleId),
                            eq(rolePermissions.permissionId, perm.id)
                        ));

                    if (!exists) {
                        await tx.insert(rolePermissions).values({
                            roleId,
                            permissionId: perm.id,
                        });
                        results.applied++;
                    }
                }
            });

            await auditService.logSuccess(req, "roles", "apply_template", {
                resourceType: "role",
                resourceId: roleId.toString(),
                metadata: { templateId, templateName: template.name, ...results }
            });

            res.status(200).json({ message: "Template applied", ...results });
        } catch (error) {
            console.error("[RBAC API] Template application failed:", error);
            res.status(500).json({ message: "Failed to apply template" });
        }
    }
);

/**
 * PUT /api/admin/rbac/roles/hierarchy
 * Update role hierarchy levels
 */
router.put("/roles/hierarchy",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        try {
            const { roleIds } = req.body;

            if (!Array.isArray(roleIds)) {
                return res.status(400).json({ message: "Invalid format. Expected roleIds array." });
            }

            await db.transaction(async (tx) => {
                // Roles at index 0 get higher level
                const total = roleIds.length;
                for (let i = 0; i < total; i++) {
                    const roleId = roleIds[i];
                    // Example: 5 roles. i=0 -> level 50. i=4 -> level 10.
                    const level = (total - i) * 10;

                    await tx.update(roles)
                        .set({ hierarchyLevel: level })
                        .where(eq(roles.id, roleId));
                }
            });

            await auditService.logSuccess(req, "system", "update_hierarchy", {
                resourceType: "role",
                metadata: { count: roleIds.length }
            });

            res.json({ message: "Hierarchy updated" });
        } catch (error) {
            console.error("[RBAC API] Hierarchy update failed:", error);
            res.status(500).json({ message: "Failed to update hierarchy" });
        }
    }
);

/**
 * GET /api/admin/rbac/permissions
 * List all available permissions
 */
router.get("/permissions",
    requireAuth,
    restrictTo("admin", "manager"),
    async (req: Request, res: Response) => {
        try {
            const allPermissions = await db
                .select()
                .from(permissions)
                .orderBy(permissions.domain, permissions.action);

            // Group by domain
            const grouped = allPermissions.reduce((acc, perm) => {
                if (!acc[perm.domain]) {
                    acc[perm.domain] = [];
                }
                acc[perm.domain].push(perm);
                return acc;
            }, {} as Record<string, typeof allPermissions>);

            res.json({ permissions: grouped });
        } catch (error) {
            console.error("[RBAC API] Error fetching permissions:", error);
            res.status(500).json({ message: "Failed to fetch permissions" });
        }
    }
);

/**
 * POST /api/admin/rbac/permissions
 * Create a new permission
 */
router.post("/permissions",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        try {
            const data = insertPermissionSchema.parse(req.body);

            const [newPermission] = await db
                .insert(permissions)
                .values(data)
                .returning();

            await auditService.logSuccess(req, "permissions", "create", {
                resourceType: "permission",
                resourceId: newPermission.id.toString(),
                newValue: newPermission,
            });

            res.status(201).json({ permission: newPermission });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: "Invalid input", errors: error.errors });
            } else {
                console.error("[RBAC API] Error creating permission:", error);
                res.status(500).json({ message: "Failed to create permission" });
            }
        }
    }
);

/**
 * PUT /api/admin/rbac/permissions/:permissionId
 * Update an existing permission
 */
router.put("/permissions/:permissionId",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        const permissionId = parseInt(getParam(req.params.permissionId));

        try {
            const data = insertPermissionSchema.partial().parse(req.body);

            // Get old value for audit
            const [oldPermission] = await db
                .select()
                .from(permissions)
                .where(eq(permissions.id, permissionId));

            if (!oldPermission) {
                return res.status(404).json({ message: "Permission not found" });
            }

            const [updatedPermission] = await db
                .update(permissions)
                .set(data)
                .where(eq(permissions.id, permissionId))
                .returning();

            await auditService.logSuccess(req, "permissions", "update", {
                resourceType: "permission",
                resourceId: permissionId.toString(),
                oldValue: oldPermission,
                newValue: updatedPermission,
            });

            res.json({ permission: updatedPermission });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: "Invalid input", errors: error.errors });
            } else {
                console.error("[RBAC API] Error updating permission:", error);
                res.status(500).json({ message: "Failed to update permission" });
            }
        }
    }
);

/**
 * DELETE /api/admin/rbac/permissions/:permissionId
 * Delete a permission
 */
router.delete("/permissions/:permissionId",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        const permissionId = parseInt(getParam(req.params.permissionId));

        try {
            // Get old value for audit
            const [oldPermission] = await db
                .select()
                .from(permissions)
                .where(eq(permissions.id, permissionId));

            if (!oldPermission) {
                return res.status(404).json({ message: "Permission not found" });
            }

            // Cascade delete will handle role_permissions
            await db.delete(permissions).where(eq(permissions.id, permissionId));

            await auditService.logSuccess(req, "permissions", "delete", {
                resourceType: "permission",
                resourceId: permissionId.toString(),
                oldValue: oldPermission,
            });

            res.status(204).send();
        } catch (error) {
            console.error("[RBAC API] Error deleting permission:", error);
            res.status(500).json({ message: "Failed to delete permission" });
        }
    }
);

/**
 * GET /api/admin/rbac/roles/:roleId/permissions
 * Get permissions for a specific role
 */
router.get("/roles/:roleId/permissions",
    requireAuth,
    restrictTo("admin", "manager"),
    async (req: Request, res: Response) => {
        const roleId = parseInt(getParam(req.params.roleId));

        try {
            const rolePerms = await db
                .select({
                    permissionId: permissions.id,
                    domain: permissions.domain,
                    action: permissions.action,
                    resource: permissions.resource,
                    description: permissions.description,
                    constraintValue: rolePermissions.constraintValue,
                    requiresApproval: rolePermissions.requiresApproval,
                })
                .from(rolePermissions)
                .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
                .where(eq(rolePermissions.roleId, roleId));

            res.json({ permissions: rolePerms });
        } catch (error) {
            console.error("[RBAC API] Error fetching role permissions:", error);
            res.status(500).json({ message: "Failed to fetch role permissions" });
        }
    }
);

/**
 * POST /api/admin/rbac/roles/:roleId/permissions
 * Assign a permission to a role
 */
router.post("/roles/:roleId/permissions",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        const roleId = parseInt(getParam(req.params.roleId));

        try {
            // Include roleId in body or validate it matches
            const body = { ...req.body, roleId };
            const data = insertRolePermissionSchema.parse(body);

            // Check if already exists
            const [existing] = await db
                .select()
                .from(rolePermissions)
                .where(and(
                    eq(rolePermissions.roleId, roleId),
                    eq(rolePermissions.permissionId, data.permissionId)
                ));

            if (existing) {
                return res.status(409).json({ message: "Permission already assigned to role" });
            }

            const [newAssignment] = await db
                .insert(rolePermissions)
                .values(data)
                .returning();

            // Invalidate cache
            await authorizationService.invalidatePermissionCache(roleId);

            await auditService.logSuccess(req, "roles", "update", {
                resourceType: "role_permission",
                resourceId: newAssignment.id.toString(),
                newValue: newAssignment,
            });

            res.status(201).json({ rolePermission: newAssignment });
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ message: "Invalid input", errors: error.errors });
            } else {
                console.error("[RBAC API] Error assigning permission to role:", error);
                res.status(500).json({ message: "Failed to assign permission" });
            }
        }
    }
);

/**
 * DELETE /api/admin/rbac/roles/:roleId/permissions/:permissionId
 * Remove a permission from a role
 */
router.delete("/roles/:roleId/permissions/:permissionId",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        const roleId = parseInt(getParam(req.params.roleId));
        const permissionId = parseInt(getParam(req.params.permissionId));

        try {
            const [deleted] = await db
                .delete(rolePermissions)
                .where(and(
                    eq(rolePermissions.roleId, roleId),
                    eq(rolePermissions.permissionId, permissionId)
                ))
                .returning();

            if (!deleted) {
                return res.status(404).json({ message: "Permission not assigned to role" });
            }

            // Invalidate cache
            await authorizationService.invalidatePermissionCache(roleId);

            await auditService.logSuccess(req, "roles", "update", {
                resourceType: "role_permission",
                resourceId: deleted.id.toString(),
                oldValue: deleted,
            });

            res.status(204).send();
        } catch (error) {
            console.error("[RBAC API] Error removing permission from role:", error);
            res.status(500).json({ message: "Failed to remove permission" });
        }
    }
);

// ============================================================================
// USER ROLE ASSIGNMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/rbac/users/:userId/roles
 * Get roles assigned to a user
 */
router.get("/users/:userId/roles",
    requireAuth,
    restrictTo("admin", "manager"),
    async (req: Request, res: Response) => {
        const userId = parseInt(getParam(req.params.userId));

        try {
            const assignedRoles = await db
                .select({
                    assignmentId: userRoles.id,
                    roleId: roles.id,
                    roleName: roles.name,
                    displayName: roles.displayName,
                    scopeType: userRoles.scopeType,
                    scopeValue: userRoles.scopeValue,
                    grantedAt: userRoles.grantedAt,
                    expiresAt: userRoles.expiresAt,
                    isActive: userRoles.isActive,
                })
                .from(userRoles)
                .innerJoin(roles, eq(userRoles.roleId, roles.id))
                .where(eq(userRoles.userId, userId));

            res.json({ roles: assignedRoles });
        } catch (error) {
            console.error("[RBAC API] Error fetching user roles:", error);
            res.status(500).json({ message: "Failed to fetch user roles" });
        }
    }
);

/**
 * POST /api/admin/rbac/users/:userId/roles
 * Assign a role to a user
 */
const assignRoleSchema = z.object({
    roleId: z.number().int().positive(),
    scopeType: z.enum(["global", "vertical", "region", "seller"]).default("global"),
    scopeValue: z.string().optional(),
    expiresAt: z.string().datetime().optional(), // ISO date string
});

router.post("/users/:userId/roles",
    requireAuth,
    requirePermission("roles", "assign"),
    auditAction("roles", "assign"),
    async (req: Request, res: Response) => {
        const userId = parseInt(getParam(req.params.userId));
        const currentUser = req.user as { id: number; role: string };

        try {
            const body = assignRoleSchema.parse(req.body);

            // Verify target user exists
            const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
            if (!targetUser) {
                return res.status(404).json({ message: "User not found" });
            }

            // Verify role exists
            const [role] = await db.select().from(roles).where(eq(roles.id, body.roleId));
            if (!role) {
                return res.status(404).json({ message: "Role not found" });
            }

            // Check if already assigned
            const [existing] = await db.select().from(userRoles).where(
                and(
                    eq(userRoles.userId, userId),
                    eq(userRoles.roleId, body.roleId),
                    eq(userRoles.isActive, true)
                )
            );

            if (existing) {
                return res.status(400).json({ message: "Role already assigned to user" });
            }

            // Insert assignment
            const [assignment] = await db.insert(userRoles).values({
                userId,
                roleId: body.roleId,
                scopeType: body.scopeType,
                scopeValue: body.scopeValue || null,
                grantedBy: currentUser.id,
                expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
                isActive: true,
            }).returning();

            // Invalidate cache
            await authorizationService.invalidateCache(userId);

            await auditService.logSuccess(req, "roles", "assign", {
                resourceType: "user",
                resourceId: String(userId),
                newValue: { roleId: body.roleId, roleName: role.name },
            });

            res.status(201).json({
                message: "Role assigned successfully",
                assignment,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Invalid request", errors: error.errors });
            }
            console.error("[RBAC API] Error assigning role:", error);
            res.status(500).json({ message: "Failed to assign role" });
        }
    }
);

/**
 * DELETE /api/admin/rbac/users/:userId/roles/:roleId
 * Revoke a role from a user
 */
router.delete("/users/:userId/roles/:roleId",
    requireAuth,
    requirePermission("roles", "revoke"),
    auditAction("roles", "revoke"),
    async (req: Request, res: Response) => {
        const userId = parseInt(getParam(req.params.userId));
        const roleId = parseInt(getParam(req.params.roleId));

        try {
            // Soft delete (set isActive = false)
            const [updated] = await db.update(userRoles)
                .set({ isActive: false })
                .where(
                    and(
                        eq(userRoles.userId, userId),
                        eq(userRoles.roleId, roleId),
                        eq(userRoles.isActive, true)
                    )
                )
                .returning();

            if (!updated) {
                return res.status(404).json({ message: "Role assignment not found" });
            }

            // Invalidate cache
            await authorizationService.invalidateCache(userId);

            await auditService.logSuccess(req, "roles", "revoke", {
                resourceType: "user",
                resourceId: String(userId),
                oldValue: { roleId },
            });

            res.json({ message: "Role revoked successfully" });
        } catch (error) {
            console.error("[RBAC API] Error revoking role:", error);
            res.status(500).json({ message: "Failed to revoke role" });
        }
    }
);

// ============================================================================
// APPROVAL ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/rbac/approvals
 * Get pending approvals for current user
 */
router.get("/approvals",
    requireAuth,
    restrictTo("admin", "manager"),
    async (req: Request, res: Response) => {
        const user = req.user as { id: number };

        try {
            const pending = await approvalService.getPendingApprovals(user.id);
            res.json({ approvals: pending });
        } catch (error) {
            console.error("[RBAC API] Error fetching approvals:", error);
            res.status(500).json({ message: "Failed to fetch approvals" });
        }
    }
);

/**
 * POST /api/admin/rbac/approvals/:id/approve
 * Approve a pending request
 */
router.post("/approvals/:id/approve",
    requireAuth,
    auditAction("approvals", "approve"),
    async (req: Request, res: Response) => {
        const approvalId = parseInt(getParam(req.params.id));
        const user = req.user as { id: number };

        try {
            const result = await approvalService.approveRequest(approvalId, user.id);

            if (!result.success) {
                return res.status(400).json({ message: result.message });
            }

            await auditService.logSuccess(req, "approvals", "approve", {
                resourceType: "approval",
                resourceId: String(approvalId),
            });

            res.json({ message: "Request approved", approvalId });
        } catch (error) {
            console.error("[RBAC API] Error approving request:", error);
            res.status(500).json({ message: "Failed to approve request" });
        }
    }
);

/**
 * POST /api/admin/rbac/approvals/:id/reject
 * Reject a pending request
 */
const rejectSchema = z.object({
    reason: z.string().min(1, "Rejection reason is required"),
});

router.post("/approvals/:id/reject",
    requireAuth,
    auditAction("approvals", "reject"),
    async (req: Request, res: Response) => {
        const approvalId = parseInt(getParam(req.params.id));
        const user = req.user as { id: number };

        try {
            const body = rejectSchema.parse(req.body);
            const result = await approvalService.rejectRequest(approvalId, user.id, body.reason);

            if (!result.success) {
                return res.status(400).json({ message: result.message });
            }

            await auditService.logSuccess(req, "approvals", "reject", {
                resourceType: "approval",
                resourceId: String(approvalId),
                newValue: { reason: body.reason },
            });

            res.json({ message: "Request rejected", approvalId });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Invalid request", errors: error.errors });
            }
            console.error("[RBAC API] Error rejecting request:", error);
            res.status(500).json({ message: "Failed to reject request" });
        }
    }
);

// ============================================================================
// MY PERMISSIONS ENDPOINT
// ============================================================================

/**
 * GET /api/admin/rbac/me/permissions
 * Get current user's permissions (for UI authorization)
 */
router.get("/me/permissions",
    requireAuth,
    async (req: Request, res: Response) => {
        const user = req.user as { id: number };

        try {
            const perms = await authorizationService.getUserPermissions(user.id);

            if (!perms) {
                return res.json({
                    roles: [],
                    permissions: [],
                    scopes: [],
                });
            }

            res.json({
                roles: perms.roles,
                permissions: perms.permissions.map(p => `${p.domain}.${p.action}`),
                scopes: perms.scopes,
            });
        } catch (error) {
            console.error("[RBAC API] Error fetching my permissions:", error);
            res.status(500).json({ message: "Failed to fetch permissions" });
        }
    }
);

// ============================================================================
// ELEVATION ENDPOINTS
// ============================================================================

import { elevationService } from "../services/elevation.service";

/**
 * POST /api/admin/rbac/elevations
 * Request temporary elevation for a user
 */
const elevationRequestSchema = z.object({
    userId: z.number().int().positive(),
    roleId: z.number().int().positive(),
    reason: z.string().min(10, "Reason must be at least 10 characters"),
    durationHours: z.number().int().min(1).max(24).default(4),
    scopeType: z.enum(["global", "vertical", "region", "seller"]).optional(),
    scopeValue: z.string().optional(),
});

router.post("/elevations",
    requireAuth,
    requirePermission("roles", "assign"),
    auditAction("elevation", "request"),
    async (req: Request, res: Response) => {
        const currentUser = req.user as { id: number };

        try {
            const body = elevationRequestSchema.parse(req.body);

            const result = await elevationService.requestElevation({
                ...body,
                requestedBy: currentUser.id,
            });

            if (!result.success) {
                return res.status(400).json({ message: result.message });
            }

            await auditService.logSuccess(req, "elevation", "request", {
                resourceType: "user",
                resourceId: String(body.userId),
                newValue: {
                    roleId: body.roleId,
                    durationHours: body.durationHours,
                    requiresApproval: result.requiresApproval,
                },
            });

            res.status(201).json(result);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Invalid request", errors: error.errors });
            }
            console.error("[RBAC API] Error requesting elevation:", error);
            res.status(500).json({ message: "Failed to request elevation" });
        }
    }
);

/**
 * GET /api/admin/rbac/users/:userId/elevations
 * Get active elevations for a user
 */
router.get("/users/:userId/elevations",
    requireAuth,
    restrictTo("admin", "manager"),
    async (req: Request, res: Response) => {
        const userId = parseInt(getParam(req.params.userId));

        try {
            const elevations = await elevationService.getUserElevations(userId);
            res.json({ elevations });
        } catch (error) {
            console.error("[RBAC API] Error fetching elevations:", error);
            res.status(500).json({ message: "Failed to fetch elevations" });
        }
    }
);

/**
 * DELETE /api/admin/rbac/elevations/:id
 * Revoke an elevation before expiry
 */
const revokeElevationSchema = z.object({
    reason: z.string().optional(),
});

router.delete("/elevations/:id",
    requireAuth,
    requirePermission("roles", "revoke"),
    auditAction("elevation", "revoke"),
    async (req: Request, res: Response) => {
        const elevationId = parseInt(getParam(req.params.id));
        const currentUser = req.user as { id: number };

        try {
            const body = revokeElevationSchema.parse(req.body);
            const result = await elevationService.revokeElevation(
                elevationId,
                currentUser.id,
                body.reason
            );

            if (!result.success) {
                return res.status(400).json({ message: result.message });
            }

            await auditService.logSuccess(req, "elevation", "revoke", {
                resourceType: "elevation",
                resourceId: String(elevationId),
            });

            res.json(result);
        } catch (error) {
            console.error("[RBAC API] Error revoking elevation:", error);
            res.status(500).json({ message: "Failed to revoke elevation" });
        }
    }
);

/**
 * PATCH /api/admin/rbac/elevations/:id/extend
 * Extend an existing elevation
 */
const extendElevationSchema = z.object({
    additionalHours: z.number().int().min(1).max(12),
});

router.patch("/elevations/:id/extend",
    requireAuth,
    requirePermission("roles", "assign"),
    auditAction("elevation", "extend"),
    async (req: Request, res: Response) => {
        const elevationId = parseInt(getParam(req.params.id));
        const currentUser = req.user as { id: number };

        try {
            const body = extendElevationSchema.parse(req.body);
            const result = await elevationService.extendElevation(
                elevationId,
                body.additionalHours,
                currentUser.id
            );

            if (!result.success) {
                return res.status(400).json({ message: result.message });
            }

            await auditService.logSuccess(req, "elevation", "extend", {
                resourceType: "elevation",
                resourceId: String(elevationId),
                newValue: { additionalHours: body.additionalHours, expiresAt: result.expiresAt },
            });

            res.json(result);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: "Invalid request", errors: error.errors });
            }
            console.error("[RBAC API] Error extending elevation:", error);
            res.status(500).json({ message: "Failed to extend elevation" });
        }
    }
);

// ============================================================================
// AUDIT LOGS ENDPOINTS
// ============================================================================

import { rbacAuditLogs } from "@shared/rbac-schema";
import { like, or, gte, lte, sql } from "drizzle-orm";

/**
 * GET /api/admin/rbac/audit-logs
 * Get RBAC audit logs with filtering
 */
router.get("/audit-logs",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        try {
            const {
                domain,
                action,
                status,
                userId,
                startDate,
                endDate,
                page = "1",
                limit = "50"
            } = req.query;

            const pageNum = Math.max(1, parseInt(getParam(page as string)));
            const limitNum = Math.min(100, Math.max(1, parseInt(getParam(limit as string))));
            const offset = (pageNum - 1) * limitNum;

            // Build conditions
            const conditions = [];

            if (domain) {
                conditions.push(eq(rbacAuditLogs.domain, getParam(domain as string)));
            }
            if (action) {
                conditions.push(eq(rbacAuditLogs.action, getParam(action as string)));
            }
            if (status) {
                conditions.push(eq(rbacAuditLogs.status, getParam(status as string) as "success" | "denied" | "error"));
            }
            if (userId) {
                conditions.push(eq(rbacAuditLogs.actorId, parseInt(getParam(userId as string))));
            }
            if (startDate) {
                conditions.push(gte(rbacAuditLogs.createdAt, new Date(getParam(startDate as string))));
            }
            if (endDate) {
                conditions.push(lte(rbacAuditLogs.createdAt, new Date(getParam(endDate as string))));
            }

            // Query logs
            const logs = await db
                .select({
                    id: rbacAuditLogs.id,
                    actorId: rbacAuditLogs.actorId,
                    actorRole: rbacAuditLogs.actorRole,
                    action: rbacAuditLogs.action,
                    domain: rbacAuditLogs.domain,
                    resourceType: rbacAuditLogs.resourceType,
                    resourceId: rbacAuditLogs.resourceId,
                    status: rbacAuditLogs.status,
                    errorMessage: rbacAuditLogs.errorMessage,
                    metadata: rbacAuditLogs.metadata,
                    createdAt: rbacAuditLogs.createdAt,
                })
                .from(rbacAuditLogs)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .orderBy(desc(rbacAuditLogs.createdAt))
                .limit(limitNum)
                .offset(offset);

            // Get total count
            const [countResult] = await db
                .select({ count: sql<number>`count(*)` })
                .from(rbacAuditLogs)
                .where(conditions.length > 0 ? and(...conditions) : undefined);

            res.json({
                logs,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: countResult?.count || 0,
                    totalPages: Math.ceil((countResult?.count || 0) / limitNum),
                },
            });
        } catch (error) {
            console.error("[RBAC API] Error fetching audit logs:", error);
            res.status(500).json({ message: "Failed to fetch audit logs" });
        }
    }
);


/**
 * GET /api/admin/rbac/audit-logs/export
 * Export audit logs to CSV
 */
router.get("/audit-logs/export",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        try {
            const {
                domain,
                action,
                status,
                userId,
                startDate,
                endDate,
            } = req.query;

            // Build conditions
            const conditions = [];
            if (domain) conditions.push(eq(rbacAuditLogs.domain, getParam(domain as string)));
            if (action) conditions.push(eq(rbacAuditLogs.action, getParam(action as string)));
            if (status) conditions.push(eq(rbacAuditLogs.status, getParam(status as string) as "success" | "denied" | "error"));
            if (userId) conditions.push(eq(rbacAuditLogs.actorId, parseInt(getParam(userId as string))));
            if (startDate) conditions.push(gte(rbacAuditLogs.createdAt, new Date(getParam(startDate as string))));
            if (endDate) conditions.push(lte(rbacAuditLogs.createdAt, new Date(getParam(endDate as string))));

            // Fetch logs (max 10000)
            const logs = await db
                .select()
                .from(rbacAuditLogs)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .orderBy(desc(rbacAuditLogs.createdAt))
                .limit(10000);

            // Generate CSV
            const headers = ["ID", "Time", "Actor ID", "Actor Role", "Domain", "Action", "Resource Type", "Resource ID", "Status", "Error Message"];
            const rows = logs.map(log => [
                log.id,
                log.createdAt ? new Date(log.createdAt).toISOString() : "",
                log.actorId || "System",
                log.actorRole || "",
                log.domain,
                log.action,
                log.resourceType || "",
                log.resourceId || "",
                log.status,
                log.errorMessage || ""
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));

            const csvContent = [headers.join(","), ...rows].join("\n");

            // Audit the export
            await auditService.logSuccess(req, "system", "export_audit_logs", {
                resourceType: "file",
                metadata: { count: logs.length, format: "csv" }
            });

            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename=audit-logs-${new Date().toISOString()}.csv`);
            res.send(csvContent);
        } catch (error) {
            console.error("[RBAC API] Error exporting audit logs:", error);
            res.status(500).json({ message: "Failed to export audit logs" });
        }
    }
);

/**
 * GET /api/admin/rbac/audit-logs/stats
 * Get audit log statistics
 */
router.get("/audit-logs/stats",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        try {
            // Get counts by status
            const statusCounts = await db
                .select({
                    status: rbacAuditLogs.status,
                    count: sql<number>`count(*)`,
                })
                .from(rbacAuditLogs)
                .groupBy(rbacAuditLogs.status);

            // Get counts by domain (last 24h)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const domainCounts = await db
                .select({
                    domain: rbacAuditLogs.domain,
                    count: sql<number>`count(*)`,
                })
                .from(rbacAuditLogs)
                .where(gte(rbacAuditLogs.createdAt, yesterday))
                .groupBy(rbacAuditLogs.domain);

            // Get recent denied actions
            const recentDenied = await db
                .select({
                    id: rbacAuditLogs.id,
                    actorId: rbacAuditLogs.actorId,
                    domain: rbacAuditLogs.domain,
                    action: rbacAuditLogs.action,
                    errorMessage: rbacAuditLogs.errorMessage,
                    createdAt: rbacAuditLogs.createdAt,
                })
                .from(rbacAuditLogs)
                .where(eq(rbacAuditLogs.status, "denied"))
                .orderBy(desc(rbacAuditLogs.createdAt))
                .limit(10);

            res.json({
                statusCounts: statusCounts.reduce((acc, s) => {
                    acc[s.status] = s.count;
                    return acc;
                }, {} as Record<string, number>),
                domainCounts: domainCounts.reduce((acc, d) => {
                    acc[d.domain] = d.count;
                    return acc;
                }, {} as Record<string, number>),
                recentDenied,
            });
        } catch (error) {
            console.error("[RBAC API] Error fetching audit stats:", error);
            res.status(500).json({ message: "Failed to fetch audit stats" });
        }
    }
);

// ============================================================================
// USER SEARCH ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/rbac/users/search
 * Search users by email or name
 */
router.get("/users/search",
    requireAuth,
    restrictTo("admin", "manager"),
    async (req: Request, res: Response) => {
        try {
            const { q, limit = "10" } = req.query;
            const query = getParam(q as string);
            const limitNum = Math.min(50, Math.max(1, parseInt(getParam(limit as string))));

            if (!query || query.length < 2) {
                return res.status(400).json({ message: "Search query must be at least 2 characters" });
            }

            const searchPattern = `%${query}%`;

            const foundUsers = await db
                .select({
                    id: users.id,
                    email: users.email,
                    name: users.name,
                    role: users.role,
                    isVerified: users.isVerified,
                    createdAt: users.createdAt,
                })
                .from(users)
                .where(
                    or(
                        like(users.email, searchPattern),
                        like(users.name, searchPattern)
                    )
                )
                .limit(limitNum);

            res.json({ users: foundUsers });
        } catch (error) {
            console.error("[RBAC API] Error searching users:", error);
            res.status(500).json({ message: "Failed to search users" });
        }
    }
);

/**
 * GET /api/admin/rbac/stats
 * Get RBAC system statistics
 */
router.get("/stats",
    requireAuth,
    restrictTo("admin"),
    async (req: Request, res: Response) => {
        try {
            // Count roles
            const [rolesCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(roles)
                .where(eq(roles.isActive, true));

            // Count permissions
            const [permissionsCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(permissions);

            // Count active user-role assignments
            const [assignmentsCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(userRoles)
                .where(eq(userRoles.isActive, true));

            // Count pending approvals
            const [pendingCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(approvalRequests)
                .where(eq(approvalRequests.status, "pending"));

            // Count active elevations
            const now = new Date();
            const [elevationsCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(userRoles)
                .where(
                    and(
                        eq(userRoles.isActive, true),
                        gte(userRoles.expiresAt, now)
                    )
                );

            res.json({
                roles: rolesCount?.count || 0,
                permissions: permissionsCount?.count || 0,
                activeAssignments: assignmentsCount?.count || 0,
                pendingApprovals: pendingCount?.count || 0,
                activeElevations: elevationsCount?.count || 0,
            });
        } catch (error) {
            console.error("[RBAC API] Error fetching RBAC stats:", error);
            res.status(500).json({ message: "Failed to fetch stats" });
        }
    }
);

import { approvalRequests } from "@shared/rbac-schema";

export default router;
