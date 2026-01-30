import { Router } from "express";
import { restrictTo } from "../middleware/rbac";
import { AdminController } from "../controllers/adminController";

export const adminRouter = Router();

// === ADMIN STATS ===
// === ADMIN STATS ===
adminRouter.get("/api/admin/stats/orders", restrictTo("admin", "manager"), AdminController.getStats);
adminRouter.get("/api/admin/stats/daily-sales", restrictTo("admin", "manager"), AdminController.getDailySales);
adminRouter.get("/api/admin/stats/top-products", restrictTo("admin", "manager"), AdminController.getTopProducts);
adminRouter.get("/api/admin/analytics/revenue", restrictTo("admin", "manager"), AdminController.getRevenueAnalytics);


