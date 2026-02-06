import { pgTable, serial, text, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users } from "./schema";
import { orders } from "./schema";
import { products } from "./schema";

// === ISSUE TYPES ===
export const SUPPORT_ISSUE_TYPES = [
    "tracking_query",
    "address_change",
    "cancel_request",
    "delivery_late",
    "damaged_product",
    "wrong_item",
    "refund_issue",
    "payment_deducted",
    "seller_complaint",
    "logistics_issue",
    "fraud_complaint",
    "other"
] as const;

export const TICKET_STATUSES = [
    "OPEN",
    "ASSIGNED",
    "IN_PROGRESS",
    "WAITING_FOR_CUSTOMER",
    "ESCALATED",
    "RESOLVED",
    "CLOSED"
] as const;

export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const SUPPORT_TEAMS = ["SUPPORT", "OPS", "BUSINESS", "FINANCE"] as const;

export const TICKET_LOG_ACTIONS = [
    "CREATED",
    "ASSIGNED",
    "STATUS_CHANGED",
    "PRIORITY_CHANGED",
    "ESCALATED",
    "RESOLVED",
    "CLOSED",
    "REOPENED",
    "MESSAGE_ADDED"
] as const;

// SLA Hours by Priority
export const SLA_HOURS: Record<string, number> = {
    LOW: 48,
    MEDIUM: 24,
    HIGH: 12,
    CRITICAL: 4,
};

// === SUPPORT TICKETS ===
export const supportTickets = pgTable("support_tickets", {
    id: serial("id").primaryKey(),
    ticketId: text("ticket_id").notNull().unique(), // TKT-YYYY-MM-XXXXXX
    sequenceNumber: integer("sequence_number").notNull().unique(),

    // Linked entities
    userId: integer("user_id").references(() => users.id).notNull(),
    orderId: integer("order_id").references(() => orders.id),
    productId: integer("product_id").references(() => products.id),

    // Issue details
    issueType: text("issue_type", { enum: SUPPORT_ISSUE_TYPES }).notNull(),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    attachments: jsonb("attachments").default([]), // Array of URLs

    // Status & Priority
    status: text("status", { enum: TICKET_STATUSES }).default("OPEN").notNull(),
    priority: text("priority", { enum: TICKET_PRIORITIES }).default("MEDIUM").notNull(),

    // Assignment
    assignedTo: integer("assigned_to").references(() => users.id),
    assignedTeam: text("assigned_team", { enum: SUPPORT_TEAMS }).default("SUPPORT"),

    // Escalation tracking
    escalatedFrom: integer("escalated_from"), // Self-reference to previous handler
    escalationReason: text("escalation_reason"),
    escalatedAt: timestamp("escalated_at"),

    // Strong order linking
    sellerId: integer("seller_id").references(() => users.id),

    // SLA Tracking
    slaDeadline: timestamp("sla_deadline"),
    slaBreached: boolean("sla_breached").default(false).notNull(),
    responseTimeMinutes: integer("response_time_minutes"),

    // Priority upgrade tracking
    priorityUpgradedAt: timestamp("priority_upgraded_at"),
    priorityUpgradeReason: text("priority_upgrade_reason"),

    // Reopen tracking
    reopenedAt: timestamp("reopened_at"),
    reopenCount: integer("reopen_count").default(0).notNull(),

    // Timestamps
    firstResponseAt: timestamp("first_response_at"),
    resolvedAt: timestamp("resolved_at"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index("ticket_user_idx").on(table.userId),
    orderIdIdx: index("ticket_order_idx").on(table.orderId),
    statusIdx: index("ticket_status_idx").on(table.status),
    assignedToIdx: index("ticket_assigned_idx").on(table.assignedTo),
}));

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
    id: true,
    ticketId: true,
    sequenceNumber: true,
    createdAt: true,
    updatedAt: true
});
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

// === SUPPORT TICKET LOGS (AUDIT TRAIL) ===
export const supportTicketLogs = pgTable("support_ticket_logs", {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id").references(() => supportTickets.id).notNull(),

    actionType: text("action_type", { enum: TICKET_LOG_ACTIONS }).notNull(),
    performedBy: integer("performed_by").references(() => users.id),

    oldValue: text("old_value"),
    newValue: text("new_value"),
    metadata: jsonb("metadata").default({}),

    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    ticketIdIdx: index("log_ticket_idx").on(table.ticketId),
    actionTypeIdx: index("log_action_idx").on(table.actionType),
}));

export const insertSupportTicketLogSchema = createInsertSchema(supportTicketLogs).omit({ id: true, createdAt: true });
export type SupportTicketLog = typeof supportTicketLogs.$inferSelect;
export type InsertSupportTicketLog = z.infer<typeof insertSupportTicketLogSchema>;

// === AGENT WORKLOAD (LOAD BALANCING) ===
export const agentWorkload = pgTable("agent_workload", {
    agentId: integer("agent_id").references(() => users.id).primaryKey(),

    activeTicketCount: integer("active_ticket_count").default(0).notNull(),
    maxActiveTickets: integer("max_active_tickets").default(20).notNull(),
    isAvailable: boolean("is_available").default(true).notNull(),

    lastAssignedAt: timestamp("last_assigned_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAgentWorkloadSchema = createInsertSchema(agentWorkload).omit({ createdAt: true, updatedAt: true });
export type AgentWorkload = typeof agentWorkload.$inferSelect;
export type InsertAgentWorkload = z.infer<typeof insertAgentWorkloadSchema>;

// === TICKET MESSAGES ===
export const ticketMessages = pgTable("ticket_messages", {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id").references(() => supportTickets.id).notNull(),

    senderType: text("sender_type", { enum: ["user", "agent", "admin", "system"] }).notNull(),
    senderId: integer("sender_id").references(() => users.id),

    message: text("message").notNull(),
    attachments: jsonb("attachments").default([]),

    isInternal: boolean("is_internal").default(false).notNull(), // Internal notes

    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    ticketIdIdx: index("message_ticket_idx").on(table.ticketId),
}));

export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({ id: true, createdAt: true });
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;

// === CHAT CONVERSATIONS ===
export const chatConversations = pgTable("chat_conversations", {
    id: serial("id").primaryKey(),
    conversationId: text("conversation_id").notNull().unique(), // CHAT-XXXX

    userId: integer("user_id").references(() => users.id).notNull(),
    orderId: integer("order_id").references(() => orders.id), // Optional

    assignedAgentId: integer("assigned_agent_id").references(() => users.id),

    status: text("status", { enum: ["waiting", "active", "closed"] }).default("waiting").notNull(),

    // If converted to ticket
    convertedToTicketId: integer("converted_to_ticket_id").references(() => supportTickets.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    closedAt: timestamp("closed_at"),
}, (table) => ({
    userIdIdx: index("chat_user_idx").on(table.userId),
    statusIdx: index("chat_status_idx").on(table.status),
}));

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({
    id: true,
    conversationId: true,
    createdAt: true
});
export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;

// === CHAT MESSAGES ===
export const chatMessages = pgTable("chat_messages", {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id").references(() => chatConversations.id).notNull(),

    senderType: text("sender_type", { enum: ["user", "agent"] }).notNull(),
    senderId: integer("sender_id").references(() => users.id).notNull(),

    message: text("message").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    conversationIdIdx: index("chat_msg_conversation_idx").on(table.conversationId),
}));

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// === RELATIONS ===
export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
    user: one(users, { fields: [supportTickets.userId], references: [users.id] }),
    order: one(orders, { fields: [supportTickets.orderId], references: [orders.id] }),
    assignedAgent: one(users, { fields: [supportTickets.assignedTo], references: [users.id] }),
    messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
    ticket: one(supportTickets, { fields: [ticketMessages.ticketId], references: [supportTickets.id] }),
    sender: one(users, { fields: [ticketMessages.senderId], references: [users.id] }),
}));

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
    user: one(users, { fields: [chatConversations.userId], references: [users.id] }),
    order: one(orders, { fields: [chatConversations.orderId], references: [orders.id] }),
    agent: one(users, { fields: [chatConversations.assignedAgentId], references: [users.id] }),
    messages: many(chatMessages),
    ticket: one(supportTickets, { fields: [chatConversations.convertedToTicketId], references: [supportTickets.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
    conversation: one(chatConversations, { fields: [chatMessages.conversationId], references: [chatConversations.id] }),
    sender: one(users, { fields: [chatMessages.senderId], references: [users.id] }),
}));
