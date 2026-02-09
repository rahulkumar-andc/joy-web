import { Router } from "express";
import { CannedResponseController } from "../controllers/cannedResponseController";
import { requireAuth, requireRole } from "../middleware/auth";

export const cannedResponseRouter = Router();

// All routes require admin or manager privileges
cannedResponseRouter.use(requireAuth, requireRole(["admin", "manager"]));

cannedResponseRouter.get("/", CannedResponseController.getAll);
cannedResponseRouter.post("/", CannedResponseController.create);
cannedResponseRouter.put("/:id", CannedResponseController.update);
cannedResponseRouter.delete("/:id", CannedResponseController.delete);
