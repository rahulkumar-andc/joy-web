import { Request, Response } from "express";
import { supportRepository } from "../repositories/supportRepository";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";

export class SupportController {

    // === USER ENDPOINTS ===

    // POST /api/support/tickets - Create a new ticket
    static createTicket = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user?.id;
        if (!userId) throw new AppError("Unauthorized", 401);

        const { orderId, productId, issueType, subject, description, attachments } = req.body;

        if (!issueType || !subject || !description) {
            throw new AppError("Missing required fields: issueType, subject, description", 400);
        }

        const ticket = await supportRepository.createTicket({
            userId,
            orderId: orderId || null,
            productId: productId || null,
            issueType,
            subject,
            description,
            attachments: attachments || [],
        });

        res.status(201).json({
            success: true,
            message: "Ticket created successfully",
            data: {
                ticketId: ticket.ticketId,
                status: ticket.status,
                priority: ticket.priority,
            }
        });
    });

    // GET /api/support/tickets - Get user's tickets
    static getUserTickets = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user?.id;
        if (!userId) throw new AppError("Unauthorized", 401);

        const tickets = await supportRepository.getTicketsByUser(userId);

        res.json({ success: true, data: tickets });
    });

    // GET /api/support/tickets/:id - Get ticket details
    static getTicketDetails = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user?.id;
        const ticketId = parseInt(String(req.params.id));

        const ticket = await supportRepository.getTicketById(ticketId);
        if (!ticket) throw new AppError("Ticket not found", 404);

        // Users can only view their own tickets (unless admin)
        const userRole = (req as any).user?.role;
        if (ticket.userId !== userId && !["admin", "manager"].includes(userRole)) {
            throw new AppError("Not authorized to view this ticket", 403);
        }

        const messages = await supportRepository.getMessages(ticketId);

        res.json({ success: true, data: { ...ticket, messages } });
    });

    // POST /api/support/tickets/:id/reply - Add a reply
    static addReply = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user?.id;
        const userRole = (req as any).user?.role;
        const ticketId = parseInt(String(req.params.id));

        const ticket = await supportRepository.getTicketById(ticketId);
        if (!ticket) throw new AppError("Ticket not found", 404);

        // Determine sender type
        let senderType: "user" | "agent" | "admin" = "user";
        if (["admin", "manager"].includes(userRole)) {
            senderType = "admin";
        } else if (ticket.assignedTo === userId) {
            senderType = "agent";
        } else if (ticket.userId !== userId) {
            throw new AppError("Not authorized to reply to this ticket", 403);
        }

        const { message, attachments, isInternal } = req.body;
        if (!message) throw new AppError("Message is required", 400);

        const reply = await supportRepository.addMessage({
            ticketId,
            senderType,
            senderId: userId,
            message,
            attachments: attachments || [],
            isInternal: isInternal && senderType !== "user" ? true : false,
        });

        // Broadcast real-time update
        try {
            const { webSocketService } = await import("../services/websocketService");

            // Notify the ticket owner (User)
            // Even if the sender is the user, we send it back so other tabs update (?)
            // Actually, mostly useful if Admin/Agent sends it.
            if (senderType !== "user") {
                webSocketService.broadcastToUser(ticket.userId, "TICKET_UPDATED", {
                    ticketId,
                    message: reply
                });
            }

            // Notify Admins (always)
            webSocketService.broadcast("TICKET_UPDATED", {
                ticketId,
                message: reply
            });

        } catch (wsError) {
            console.error("Failed to broadcast ticket update:", wsError);
        }

        res.status(201).json({ success: true, data: reply });
    });

    // === AGENT/ADMIN ENDPOINTS ===

    // GET /api/admin/support/tickets - Get all tickets (with filters)
    static getAllTickets = catchAsync(async (req: Request, res: Response) => {
        const { page = 1, limit = 20, status, priority, team, search } = req.query;

        const result = await supportRepository.getAllTickets(
            Number(page),
            Number(limit),
            {
                status: status as string,
                priority: priority as string,
                team: team as string,
                search: search as string
            }
        );

        res.json({ success: true, ...result });
    });

    // GET /api/admin/support/my-tickets - Get agent's assigned tickets
    static getMyAssignedTickets = catchAsync(async (req: Request, res: Response) => {
        const agentId = (req as any).user?.id;

        const tickets = await supportRepository.getTicketsForAgent(agentId);

        res.json({ success: true, data: tickets });
    });

    // PATCH /api/admin/support/tickets/:id/assign - Assign ticket
    static assignTicket = catchAsync(async (req: Request, res: Response) => {
        const ticketId = parseInt(String(req.params.id));
        const adminId = (req as any).user?.id;
        const { agentId } = req.body;

        if (!agentId) throw new AppError("agentId is required", 400);

        const ticket = await supportRepository.assignTicket(ticketId, agentId, adminId);
        if (!ticket) throw new AppError("Ticket not found", 404);

        res.json({ success: true, message: "Ticket assigned", data: ticket });
    });

    // PATCH /api/admin/support/tickets/:id/status - Update status
    static updateStatus = catchAsync(async (req: Request, res: Response) => {
        const ticketId = parseInt(String(req.params.id));
        const adminId = (req as any).user?.id;
        const { status } = req.body;

        const validStatuses = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "ESCALATED", "RESOLVED", "CLOSED"];
        if (!validStatuses.includes(status)) {
            throw new AppError("Invalid status", 400);
        }

        const ticket = await supportRepository.updateStatus(ticketId, status, adminId);
        if (!ticket) throw new AppError("Ticket not found", 404);

        res.json({ success: true, message: "Status updated", data: ticket });
    });

    // POST /api/admin/support/tickets/:id/escalate - Escalate ticket
    static escalateTicket = catchAsync(async (req: Request, res: Response) => {
        const ticketId = parseInt(String(req.params.id));
        const agentId = (req as any).user?.id;
        const { reason } = req.body;

        if (!reason) throw new AppError("Escalation reason is required", 400);

        const ticket = await supportRepository.escalateTicket(ticketId, reason, agentId);
        if (!ticket) throw new AppError("Ticket not found", 404);

        res.json({ success: true, message: "Ticket escalated", data: ticket });
    });

    // GET /api/admin/support/tickets/:id/audit - Get audit log
    static getAuditLog = catchAsync(async (req: Request, res: Response) => {
        const ticketId = parseInt(String(req.params.id));

        const logs = await supportRepository.getTicketAuditLog(ticketId);

        res.json({ success: true, data: logs });
    });
}

