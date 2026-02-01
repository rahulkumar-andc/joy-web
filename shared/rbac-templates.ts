import { PermissionDomains, PermissionActions } from "./rbac-schema";

export interface TemplatePermission {
    domain: string;
    action: string;
    resource?: string;
}

export const PermissionTemplates = [
    {
        id: "read_only",
        name: "Read-Only Access",
        description: "View-only access to all system domains",
        permissions: [
            { domain: PermissionDomains.USERS, action: PermissionActions.READ },
            { domain: PermissionDomains.ROLES, action: PermissionActions.READ },
            { domain: PermissionDomains.CATALOG, action: PermissionActions.READ },
            { domain: PermissionDomains.ORDERS, action: PermissionActions.READ },
            { domain: PermissionDomains.REFUNDS, action: PermissionActions.READ },
            { domain: PermissionDomains.SELLERS, action: PermissionActions.READ },
            { domain: PermissionDomains.FINANCE, action: PermissionActions.READ },
            { domain: PermissionDomains.REPORTS, action: PermissionActions.READ },
            { domain: PermissionDomains.SYSTEM, action: PermissionActions.READ },
        ]
    },
    {
        id: "manager_standard",
        name: "Standard Manager",
        description: "Full management of orders, catalog, and refunds. Read access to reports.",
        permissions: [
            { domain: PermissionDomains.ORDERS, action: PermissionActions.MANAGE },
            { domain: PermissionDomains.CATALOG, action: PermissionActions.MANAGE },
            { domain: PermissionDomains.REFUNDS, action: PermissionActions.MANAGE },
            { domain: PermissionDomains.REPORTS, action: PermissionActions.READ },
            { domain: PermissionDomains.SELLERS, action: PermissionActions.READ },
        ]
    },
    {
        id: "support_agent",
        name: "Support Agent",
        description: "Manage orders and refunds. View users and catalog.",
        permissions: [
            { domain: PermissionDomains.ORDERS, action: PermissionActions.MANAGE },
            { domain: PermissionDomains.REFUNDS, action: PermissionActions.MANAGE },
            { domain: PermissionDomains.USERS, action: PermissionActions.READ },
            { domain: PermissionDomains.CATALOG, action: PermissionActions.READ },
        ]
    },
    {
        id: "content_editor",
        name: "Content Editor",
        description: "Manage catalog (products/categories) only.",
        permissions: [
            { domain: PermissionDomains.CATALOG, action: PermissionActions.MANAGE },
        ]
    }
];

export type PermissionTemplate = typeof PermissionTemplates[number];
