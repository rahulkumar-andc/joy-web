import { Router } from "express";
import { SupportController } from "../controllers/supportController";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireRole";

const router = Router();

// All routes require admin/manager role
router.use(requireAuth);
router.use(requireAdmin());

router.get("/tickets", SupportController.getAllTickets);
router.get("/my-tickets", SupportController.getMyAssignedTickets);
router.get("/tickets/:id", SupportController.getTicketDetails);
router.get("/tickets/:id/audit", SupportController.getAuditLog);
router.post("/tickets/:id/reply", SupportController.addReply);
router.patch("/tickets/:id/assign", SupportController.assignTicket);
router.patch("/tickets/:id/status", SupportController.updateStatus);
router.post("/tickets/:id/escalate", SupportController.escalateTicket);

export default router;
