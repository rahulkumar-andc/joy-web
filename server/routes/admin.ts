import { Router } from "express";
import { restrictTo } from "../middleware/rbac";
import { AdminController } from "../controllers/adminController";
import { OrderController } from "../controllers/orderController";
import multer from "multer";
import { importExportService } from "../services/importExportService";
import { logger } from "../logger";

export const adminRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

// === ADMIN STATS ===
adminRouter.get("/api/admin/stats/orders", restrictTo("admin", "manager"), AdminController.getStats);
adminRouter.get("/api/admin/stats/dashboard", restrictTo("admin", "manager"), AdminController.getDashboardStats);
adminRouter.get("/api/admin/stats/daily-sales", restrictTo("admin", "manager"), AdminController.getDailySales);
adminRouter.get("/api/admin/stats/top-products", restrictTo("admin", "manager"), AdminController.getTopProducts);
adminRouter.get("/api/admin/analytics/revenue", restrictTo("admin", "manager"), AdminController.getRevenueAnalytics);

// === DATA MIGRATION ===
adminRouter.post("/api/admin/products/import", restrictTo("admin"), upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    try {
        const result = await importExportService.importProductsFromCSV(req.file.buffer);
        res.json(result);
    } catch (error) {
        logger.error("Import failed:", error);
        res.status(500).json({ error: "Import failed" });
    }
});

adminRouter.get("/api/admin/products/export", restrictTo("admin"), async (req, res) => {
    try {
        const csv = await importExportService.exportProductsToCSV();
        res.header("Content-Type", "text/csv");
        res.attachment("products_export.csv");
        res.send(csv);
    } catch (error) {
        logger.error("Export failed:", error);
        res.status(500).json({ error: "Export failed" });
    }
});

adminRouter.get("/api/admin/reports/orders/export", restrictTo("admin", "manager"), async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

        const csv = await importExportService.exportOrdersToCSV(startDate, endDate);
        res.header("Content-Type", "text/csv");
        res.attachment(`orders_report_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (error) {
        logger.error("Order export failed:", error);
        res.status(500).json({ error: "Order export failed" });
    }
});

adminRouter.get("/api/admin/customers/:id", restrictTo("admin", "manager"), AdminController.getCustomerProfile);

// === USERS MANAGEMENT ===
adminRouter.get("/api/admin/users", restrictTo("admin", "manager"), AdminController.getUsers);
adminRouter.put("/api/admin/users/:id", restrictTo("admin"), AdminController.manageUser);

// === SELLERS MANAGEMENT ===
adminRouter.get("/api/admin/sellers", restrictTo("admin", "manager"), AdminController.getSellers);
adminRouter.put("/api/admin/sellers/:sellerId/action", restrictTo("admin"), AdminController.manageSeller);

// === PAYOUTS MANAGEMENT ===
adminRouter.get("/api/admin/payouts", restrictTo("admin", "manager"), AdminController.getPayouts);
adminRouter.put("/api/admin/payouts/:id", restrictTo("admin"), AdminController.managePayout);

// === PRODUCT MODERATION ===
adminRouter.get("/api/admin/products/pending", restrictTo("admin", "manager"), AdminController.getPendingProducts);

// PATCH /api/admin/products/:productId/status - Approve or reject a product
import { sellerProductService } from "../services/seller";
import { z } from "zod";

const productStatusSchema = z.object({
    status: z.enum(["approved", "rejected"]),
    reason: z.string().optional(),
});

adminRouter.patch("/api/admin/products/:productId/status", restrictTo("admin", "manager"), async (req, res) => {
    try {
        const productIdParam = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
        const productId = parseInt(productIdParam || "0", 10);
        if (isNaN(productId) || productId <= 0) {
            return res.status(400).json({ error: "Invalid product ID" });
        }

        const adminId = (req.user as any)?.id;
        if (!adminId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const parsed = productStatusSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten().fieldErrors,
            });
        }

        const { status, reason } = parsed.data;

        let result;
        if (status === "approved") {
            result = await sellerProductService.approveProduct(productId, adminId);
        } else {
            if (!reason) {
                return res.status(400).json({ error: "Reason is required for rejection" });
            }
            result = await sellerProductService.rejectProduct(productId, adminId, reason);
        }

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json({
            message: `Product ${status} successfully`,
            productId,
            status,
        });
    } catch (error) {
        logger.error("Product moderation failed:", error);
        res.status(500).json({ error: "Failed to update product status" });
    }
});

