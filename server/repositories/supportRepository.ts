import { db } from "../db";
import {
    supportTickets, ticketMessages, supportTicketLogs, agentWorkload,
    users, orders, SLA_HOURS
} from "@shared/schema";
import { eq, desc, and, sql, or, ilike, asc, lt } from "drizzle-orm";
import type {
    SupportTicket, TicketMessage, InsertSupportTicket, InsertTicketMessage,
    SupportTicketLog, InsertSupportTicketLog
} from "@shared/schema";

// Auto-assignment rules
const ISSUE_ROUTING: Record<string, { team: string; priority: string }> = {
    "tracking_query": { team: "SUPPORT", priority: "LOW" },
    "address_change": { team: "SUPPORT", priority: "LOW" },
    "cancel_request": { team: "SUPPORT", priority: "MEDIUM" },
    "delivery_late": { team: "SUPPORT", priority: "MEDIUM" },
    "damaged_product": { team: "SUPPORT", priority: "HIGH" },
    "wrong_item": { team: "SUPPORT", priority: "HIGH" },
    "refund_issue": { team: "SUPPORT", priority: "HIGH" },
    "payment_deducted": { team: "SUPPORT", priority: "CRITICAL" },
    "seller_complaint": { team: "BUSINESS", priority: "MEDIUM" },
    "logistics_issue": { team: "OPS", priority: "HIGH" },
    "fraud_complaint": { team: "SUPPORT", priority: "CRITICAL" },
    "other": { team: "SUPPORT", priority: "MEDIUM" },
};

export class SupportRepository {

    // === AUDIT LOGGING ===
    async logAction(
        ticketId: number,
        actionType: string,
        performedBy: number | null,
        oldValue?: string | null,
        newValue?: string | null,
        metadata?: object
    ): Promise<void> {
        await db.insert(supportTicketLogs).values({
            ticketId,
            actionType: actionType as any,
            performedBy,
            oldValue: oldValue ?? undefined,
            newValue: newValue ?? undefined,
            metadata: metadata || {},
        });
    }

    // === TICKET CREATION ===
    async createTicket(data: InsertSupportTicket, createdBy?: number): Promise<SupportTicket> {
        return await db.transaction(async (tx) => {
            // 1. Get sequence
            const seqResult = await tx.execute(sql`SELECT nextval('global_ticket_seq') as seq`);
            const seq = Number(seqResult.rows[0].seq);

            // 2. Generate ticket ID
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const ticketId = `TKT-${year}-${month}-${String(seq).padStart(6, '0')}`;

            // 3. Auto-assign priority and team
            const routing = ISSUE_ROUTING[data.issueType] || ISSUE_ROUTING["other"];
            const priority = (data.priority || routing.priority) as string;

            // 4. Calculate SLA deadline
            const slaHours = SLA_HOURS[priority] || 24;
            const slaDeadline = new Date(now.getTime() + slaHours * 60 * 60 * 1000);

            // 5. Insert ticket
            const [ticket] = await tx.insert(supportTickets).values({
                ...data,
                ticketId,
                sequenceNumber: seq,
                priority: priority as any,
                assignedTeam: routing.team as any,
                status: "OPEN",
                slaDeadline,
                slaBreached: false,
            }).returning();

            // 6. Log creation
            await tx.insert(supportTicketLogs).values({
                ticketId: ticket.id,
                actionType: "CREATED",
                performedBy: createdBy || data.userId,
                newValue: ticketId,
                metadata: { issueType: data.issueType, priority, slaDeadline },
            });

            return ticket;
        });
    }

    // === TICKET QUERIES ===
    async getTicketById(id: number): Promise<SupportTicket | undefined> {
        return await db.query.supportTickets.findFirst({
            where: eq(supportTickets.id, id),
            with: {
                user: true,
                order: true,
                assignedAgent: true,
                messages: {
                    orderBy: desc(ticketMessages.createdAt),
                },
            },
        });
    }

    async getTicketByTicketId(ticketId: string): Promise<SupportTicket | undefined> {
        return await db.query.supportTickets.findFirst({
            where: eq(supportTickets.ticketId, ticketId),
            with: {
                user: true,
                order: true,
                assignedAgent: true,
                messages: true,
            },
        });
    }

    async getTicketsByUser(userId: number): Promise<SupportTicket[]> {
        return await db.query.supportTickets.findMany({
            where: eq(supportTickets.userId, userId),
            orderBy: desc(supportTickets.createdAt),
            with: { order: true },
        });
    }

    async getTicketsForAgent(agentId: number): Promise<SupportTicket[]> {
        return await db.query.supportTickets.findMany({
            where: eq(supportTickets.assignedTo, agentId),
            orderBy: desc(supportTickets.createdAt),
            with: { user: true, order: true },
        });
    }

    async getAllTickets(
        page: number = 1,
        limit: number = 20,
        filters: { status?: string; priority?: string; team?: string; search?: string } = {}
    ): Promise<{ tickets: SupportTicket[]; total: number }> {
        const offset = (page - 1) * limit;
        const conditions = [];

        if (filters.status) conditions.push(eq(supportTickets.status, filters.status as any));
        if (filters.priority) conditions.push(eq(supportTickets.priority, filters.priority as any));
        if (filters.team) conditions.push(eq(supportTickets.assignedTeam, filters.team as any));
        if (filters.search) {
            conditions.push(
                or(
                    ilike(supportTickets.ticketId, `%${filters.search}%`),
                    ilike(supportTickets.subject, `%${filters.search}%`)
                )
            );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const tickets = await db.query.supportTickets.findMany({
            where: whereClause,
            orderBy: desc(supportTickets.createdAt),
            limit,
            offset,
            with: { user: true, assignedAgent: true },
        });

        const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(supportTickets).where(whereClause);

        return { tickets, total: Number(count) };
    }

    // === TICKET UPDATES ===
    async assignTicket(ticketId: number, agentId: number, assignedBy: number): Promise<SupportTicket | undefined> {
        // Get current ticket for logging
        const current = await db.query.supportTickets.findFirst({ where: eq(supportTickets.id, ticketId) });

        const [updated] = await db.update(supportTickets)
            .set({
                assignedTo: agentId,
                status: "ASSIGNED",
                updatedAt: new Date(),
            })
            .where(eq(supportTickets.id, ticketId))
            .returning();

        if (updated) {
            // Log assignment
            await this.logAction(ticketId, "ASSIGNED", assignedBy,
                current?.assignedTo?.toString() || null,
                agentId.toString()
            );

            // Update workload counter
            await db.update(agentWorkload)
                .set({
                    activeTicketCount: sql`active_ticket_count + 1`,
                    lastAssignedAt: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(agentWorkload.agentId, agentId));
        }

        return updated;
    }

    async updateStatus(ticketId: number, status: string, updatedBy: number): Promise<SupportTicket | undefined> {
        // Get current for logging
        const current = await db.query.supportTickets.findFirst({ where: eq(supportTickets.id, ticketId) });
        const oldStatus = current?.status;

        const updates: any = { status: status as any, updatedAt: new Date() };

        if (status === "RESOLVED") updates.resolvedAt = new Date();
        if (status === "CLOSED") updates.closedAt = new Date();

        // Handle reopen
        if (oldStatus === "CLOSED" && status !== "CLOSED") {
            updates.reopenedAt = new Date();
            updates.reopenCount = sql`reopen_count + 1`;
        }

        const [updated] = await db.update(supportTickets)
            .set(updates)
            .where(eq(supportTickets.id, ticketId))
            .returning();

        if (updated) {
            // Log status change
            const actionType = status === "RESOLVED" ? "RESOLVED" :
                status === "CLOSED" ? "CLOSED" :
                    oldStatus === "CLOSED" ? "REOPENED" : "STATUS_CHANGED";
            await this.logAction(ticketId, actionType, updatedBy, oldStatus, status);

            // Release workload if resolved/closed
            if ((status === "RESOLVED" || status === "CLOSED") && current?.assignedTo) {
                await db.update(agentWorkload)
                    .set({ activeTicketCount: sql`GREATEST(active_ticket_count - 1, 0)` })
                    .where(eq(agentWorkload.agentId, current.assignedTo));
            }
        }

        return updated;
    }

    async escalateTicket(ticketId: number, reason: string, currentAgentId: number): Promise<SupportTicket | undefined> {
        const current = await db.query.supportTickets.findFirst({ where: eq(supportTickets.id, ticketId) });

        const [updated] = await db.update(supportTickets)
            .set({
                status: "ESCALATED",
                escalatedFrom: currentAgentId,
                escalationReason: reason,
                escalatedAt: new Date(),
                assignedTo: null,
                updatedAt: new Date(),
            })
            .where(eq(supportTickets.id, ticketId))
            .returning();

        if (updated) {
            await this.logAction(ticketId, "ESCALATED", currentAgentId, null, reason);

            // Release workload from current agent
            if (current?.assignedTo) {
                await db.update(agentWorkload)
                    .set({ activeTicketCount: sql`GREATEST(active_ticket_count - 1, 0)` })
                    .where(eq(agentWorkload.agentId, current.assignedTo));
            }
        }

        return updated;
    }

    // === TICKET MESSAGES ===
    async addMessage(data: InsertTicketMessage): Promise<TicketMessage> {
        const [message] = await db.insert(ticketMessages).values(data).returning();

        // Get ticket for calculations
        const ticket = await db.query.supportTickets.findFirst({
            where: eq(supportTickets.id, data.ticketId)
        });

        // Mark first response and calculate response time if agent
        if (data.senderType === 'agent' || data.senderType === 'admin') {
            const now = new Date();
            const updates: any = {
                firstResponseAt: sql`COALESCE(first_response_at, NOW())`,
                status: sql`CASE WHEN status = 'OPEN' OR status = 'ASSIGNED' THEN 'IN_PROGRESS' ELSE status END`,
                updatedAt: now,
            };

            // Calculate response time if first response
            if (ticket && !ticket.firstResponseAt) {
                const createdAt = new Date(ticket.createdAt);
                const responseMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
                updates.responseTimeMinutes = responseMinutes;
            }

            await db.update(supportTickets)
                .set(updates)
                .where(eq(supportTickets.id, data.ticketId));
        }

        // Log message
        await this.logAction(data.ticketId, "MESSAGE_ADDED", data.senderId || null, null,
            data.isInternal ? "[Internal Note]" : "Message added"
        );

        return message;
    }

    async getMessages(ticketId: number, includeInternal: boolean = true): Promise<TicketMessage[]> {
        const conditions = [eq(ticketMessages.ticketId, ticketId)];
        if (!includeInternal) {
            conditions.push(eq(ticketMessages.isInternal, false));
        }
        return await db.query.ticketMessages.findMany({
            where: and(...conditions),
            orderBy: ticketMessages.createdAt,
            with: { sender: true },
        });
    }

    // === WORKLOAD BALANCING ===
    async findLeastBusyAgent(team?: string): Promise<number | null> {
        const agents = await db.query.agentWorkload.findMany({
            where: and(
                eq(agentWorkload.isAvailable, true),
                lt(agentWorkload.activeTicketCount, sql`max_active_tickets`)
            ),
            orderBy: [
                asc(agentWorkload.activeTicketCount),
                asc(agentWorkload.lastAssignedAt), // Round-robin tie-breaker
            ],
            limit: 1,
        });
        return agents[0]?.agentId || null;
    }

    async registerAgent(agentId: number, maxTickets: number = 20): Promise<void> {
        await db.insert(agentWorkload).values({
            agentId,
            activeTicketCount: 0,
            maxActiveTickets: maxTickets,
            isAvailable: true,
        }).onConflictDoUpdate({
            target: agentWorkload.agentId,
            set: { isAvailable: true, maxActiveTickets: maxTickets, updatedAt: new Date() },
        });
    }

    async setAgentAvailability(agentId: number, isAvailable: boolean): Promise<void> {
        await db.update(agentWorkload)
            .set({ isAvailable, updatedAt: new Date() })
            .where(eq(agentWorkload.agentId, agentId));
    }

    // === SLA BREACH DETECTION ===
    async getBreachedTickets(): Promise<SupportTicket[]> {
        const now = new Date();
        return await db.query.supportTickets.findMany({
            where: and(
                eq(supportTickets.slaBreached, false),
                lt(supportTickets.slaDeadline, now),
                sql`status NOT IN ('RESOLVED', 'CLOSED')`
            ),
        });
    }

    async markSlaBreached(ticketId: number): Promise<void> {
        await db.update(supportTickets)
            .set({ slaBreached: true, updatedAt: new Date() })
            .where(eq(supportTickets.id, ticketId));
    }

    // === PRIORITY AUTO-UPGRADE ===
    async upgradePriority(ticketId: number, reason: string, upgradedBy?: number): Promise<SupportTicket | undefined> {
        const ticket = await db.query.supportTickets.findFirst({ where: eq(supportTickets.id, ticketId) });
        if (!ticket) return undefined;

        const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
        const currentIdx = priorities.indexOf(ticket.priority);
        if (currentIdx >= priorities.length - 1) return ticket; // Already CRITICAL

        const newPriority = priorities[currentIdx + 1];

        const [updated] = await db.update(supportTickets)
            .set({
                priority: newPriority as any,
                priorityUpgradedAt: new Date(),
                priorityUpgradeReason: reason,
                updatedAt: new Date(),
            })
            .where(eq(supportTickets.id, ticketId))
            .returning();

        if (updated) {
            await this.logAction(ticketId, "PRIORITY_CHANGED", upgradedBy || null,
                ticket.priority, newPriority, { reason }
            );
        }

        return updated;
    }

    // === AUDIT LOG QUERIES ===
    async getTicketAuditLog(ticketId: number): Promise<SupportTicketLog[]> {
        return await db.query.supportTicketLogs.findMany({
            where: eq(supportTicketLogs.ticketId, ticketId),
            orderBy: desc(supportTicketLogs.createdAt),
        });
    }
}

export const supportRepository = new SupportRepository();

