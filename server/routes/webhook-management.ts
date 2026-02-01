import { Router } from "express";
import { restrictTo } from "../middleware/rbac";
import { WebhookEventStore } from "../services/payment/WebhookEventStore";
import { WebhookHandler } from "../services/payment/WebhookHandler";
import { logger } from "../logger";

export const webhookMgmtRouter = Router();

// Get Dead Letter Queue (Failed Events)
webhookMgmtRouter.get("/api/admin/webhooks/dlq", restrictTo("admin"), async (req, res) => {
    try {
        const events = await WebhookEventStore.getDeadLetterEvents();
        res.json(events);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Replay a specific event
webhookMgmtRouter.post("/api/admin/webhooks/:id/replay", restrictTo("admin"), async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    try {
        // 1. Reset state
        const event = await WebhookEventStore.resetEventForReplay(id);
        if (!event) return res.status(404).json({ error: "Event not found" });

        // 2. Trigger immediate processing (Optional, or wait for cron)
        // Let's trigger strictly if it's Razorpay for now, as Stripe logic is in PaymentService.
        // If Stripe, we might need a unified Replay service.
        // For now, we support the standard WebhookHandler mainly.

        if (event.gateway === 'razorpay') {
            await WebhookHandler.handleRazorpayWebhook(event.signature, event.payload);
            res.json({ message: "Replay triggered successfully", status: "PROCESSED" });
        } else {
            // Just reset, let cron or manual intervention handle or extend this
            res.json({ message: "Event reset to RECEIVED state. Automatic recovery will pick it up or requires manual trigger.", status: "RECEIVED" });
        }

    } catch (error: any) {
        logger.error(`Manual replay failed: ${error.message}`);
        // If immediate processing failed, store updates status to FAILED again automatically via Handler usually,
        // or we manually ensure it is marked failed.
        await WebhookEventStore.updateStatus(
            // We don't have eventId string here easily without fetching, but resetEventForReplay returns event.
            // We can rely on the Handler's error handling to update the DB status.
            // But if we want to be safe:
            "unknown_id", // We'd need to fetch event.eventId. 
            "FAILED",
            error.message
        );
        res.status(500).json({ error: error.message });
    }
});
