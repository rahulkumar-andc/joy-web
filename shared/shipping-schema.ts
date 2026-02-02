/**
 * Shipping Settings Schema
 * 
 * Database schema for admin-managed shipping configuration.
 * Supports RBAC-controlled settings with full audit trail.
 */

import { pgTable, serial, text, boolean, timestamp, jsonb, integer, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users } from "./schema";

// ============================================================================
// SHIPPING SETTINGS TABLE
// ============================================================================

export const shippingSettings = pgTable("shipping_settings", {
    id: serial("id").primaryKey(),
    key: varchar("key", { length: 50 }).unique().notNull(),
    value: varchar("value", { length: 255 }).notNull(),
    description: text("description"),
    // Pre-approved values for Business Admin (JSON array of strings)
    allowedValues: jsonb("allowed_values").$type<string[] | null>(),
    // Minimum hierarchy level required to modify (1 = Super Admin, 10 = Business Admin)
    minRoleLevel: integer("min_role_level").default(1),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    updatedBy: integer("updated_by").references(() => users.id),
});

// ============================================================================
// SHIPPING SETTINGS AUDIT TABLE
// ============================================================================

export const shippingSettingsAudit = pgTable("shipping_settings_audit", {
    id: serial("id").primaryKey(),
    settingKey: varchar("setting_key", { length: 50 }).notNull(),
    oldValue: varchar("old_value", { length: 255 }),
    newValue: varchar("new_value", { length: 255 }).notNull(),
    changedBy: integer("changed_by").references(() => users.id).notNull(),
    changedAt: timestamp("changed_at").defaultNow(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    changeReason: text("change_reason"),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const shippingSettingsRelations = relations(shippingSettings, ({ one }) => ({
    updater: one(users, {
        fields: [shippingSettings.updatedBy],
        references: [users.id],
    }),
}));

export const shippingSettingsAuditRelations = relations(shippingSettingsAudit, ({ one }) => ({
    changer: one(users, {
        fields: [shippingSettingsAudit.changedBy],
        references: [users.id],
    }),
}));

// ============================================================================
// INSERT SCHEMAS
// ============================================================================

export const insertShippingSettingSchema = createInsertSchema(shippingSettings).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertShippingSettingsAuditSchema = createInsertSchema(shippingSettingsAudit).omit({
    id: true,
    changedAt: true,
});

// ============================================================================
// TYPES
// ============================================================================

export type ShippingSetting = typeof shippingSettings.$inferSelect;
export type InsertShippingSetting = z.infer<typeof insertShippingSettingSchema>;

export type ShippingSettingsAuditLog = typeof shippingSettingsAudit.$inferSelect;
export type InsertShippingSettingsAudit = z.infer<typeof insertShippingSettingsAuditSchema>;

// ============================================================================
// SETTING KEYS (Type-safe constants)
// ============================================================================

export const ShippingSettingKeys = {
    FREE_SHIPPING_ENABLED: "free_shipping_enabled",
    DEFAULT_SHIPPING_COST: "default_shipping_cost",
    FREE_SHIPPING_THRESHOLD: "free_shipping_threshold",
    FESTIVE_MODE_ENABLED: "festive_mode_enabled",
    FESTIVE_THRESHOLD: "festive_threshold",
    ALWAYS_FREE_THRESHOLD: "always_free_threshold",
    GLOBAL_FREE_SHIPPING_OVERRIDE: "global_free_shipping_override",
    // New keys for enhancements
    FESTIVE_START_DATE: "festive_start_date",
    FESTIVE_END_DATE: "festive_end_date",
    NOTIFICATION_SLACK_WEBHOOK: "notification_slack_webhook",
    NOTIFICATION_EMAIL: "notification_email",
    NOTIFICATIONS_ENABLED: "notifications_enabled",
} as const;

export type ShippingSettingKey = typeof ShippingSettingKeys[keyof typeof ShippingSettingKeys];

// ============================================================================
// SHIPPING PRESETS TABLE
// ============================================================================

export const shippingPresets = pgTable("shipping_presets", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    // Settings to apply: { "key": "value" } pairs
    settings: jsonb("settings").$type<Record<string, string>>().notNull(),
    // System presets cannot be deleted
    isSystem: boolean("is_system").default(false),
    isActive: boolean("is_active").default(true),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const shippingPresetsRelations = relations(shippingPresets, ({ one }) => ({
    creator: one(users, {
        fields: [shippingPresets.createdBy],
        references: [users.id],
    }),
}));

export const insertShippingPresetSchema = createInsertSchema(shippingPresets).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type ShippingPreset = typeof shippingPresets.$inferSelect;
export type InsertShippingPreset = z.infer<typeof insertShippingPresetSchema>;

