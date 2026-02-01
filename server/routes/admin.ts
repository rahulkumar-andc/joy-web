import { Router } from "express";
import { restrictTo } from "../middleware/rbac";
import { AdminController } from "../controllers/adminController";
import multer from "multer";
import { importExportService } from "../services/importExportService";
import { logger } from "../logger";

export const adminRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

// === ADMIN STATS ===
adminRouter.get("/api/admin/stats/orders", restrictTo("admin", "manager"), AdminController.getStats);
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


