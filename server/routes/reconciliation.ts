/**
 * Reconciliation API Routes
 * 
 * Endpoints for admin to:
 * - Trigger manual reconciliation
 * - View discrepancies
 * - Resolve discrepancies manually
 */

import { Router } from "express";
import { restrictTo } from "../middleware/rbac";
import { ReconciliationService } from "../services/payment/ReconciliationService";
import { FailureRecoveryService } from "../services/payment/FailureRecoveryService";
import { db } from "../db";
import { paymentReconciliation } from "@shared/payment-schema";
import { desc, eq } from "drizzle-orm";
import { logger } from "../logger";

export const reconciliationRouter = Router();

// Trigger Reconciliation Job Manually
reconciliationRouter.post("/api/admin/reconciliation/trigger", restrictTo("admin"), async (req, res) => {
    try {
        // Trigger both standard reconciliation and failure recovery
        await ReconciliationService.reconcilePendingPayments();
        await FailureRecoveryService.recoverStuckOrders();

        res.json({ message: "Reconciliation and recovery jobs triggered successfully" });
    } catch (error: any) {
        logger.error(`Manual reconciliation failed: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Get Reconciliation Discrepancies
reconciliationRouter.get("/api/admin/reconciliation/discrepancies", restrictTo("admin"), async (req, res) => {
    try {
        const discrepancies = await db
            .select()
            .from(paymentReconciliation)
            .orderBy(desc(paymentReconciliation.createdAt))
            .limit(100);

        res.json(discrepancies);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Resolve Discrepancy Manually
reconciliationRouter.post("/api/admin/reconciliation/:id/resolve", restrictTo("admin"), async (req, res) => {
    const id = parseInt(req.params.id as string);
    const { action, note } = req.body; // action: 'mark_matched', 'ignore'

    try {
        await db.update(paymentReconciliation)
            .set({
                status: action === 'ignore' ? 'MANUAL_OVERRIDE' : 'MATCHED',
                adminNote: note,
                resolvedAt: new Date(),
                resolvedBy: (req.user as any).id
            })
            .where(eq(paymentReconciliation.id, id));

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
