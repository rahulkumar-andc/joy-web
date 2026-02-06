import { Router } from "express";
import { SupportController } from "../controllers/supportController";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// === USER ROUTES (Authenticated) ===
router.post("/tickets", requireAuth, SupportController.createTicket);
router.get("/tickets", requireAuth, SupportController.getUserTickets);
router.get("/tickets/:id", requireAuth, SupportController.getTicketDetails);
router.post("/tickets/:id/reply", requireAuth, SupportController.addReply);

export default router;
