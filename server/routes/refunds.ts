import { Router } from "express";
import { refundRepository } from "../repositories/refundRepository";
import { orderRepository } from "../repositories/orderRepository";
import { insertRefundSchema, updateRefundStatusSchema } from "@shared/schema";
import { z } from "zod";
import { restrictTo } from "../middleware/rbac";
import { AuditService } from "../services/auditService";
import { NotificationService } from "../services/notificationService";
import { userRepository } from "../repositories/userRepository";
import { WalletService } from "../services/walletService";
import { db } from "../db";
import { payments } from "@shared/schema";
import { eq } from "drizzle-orm";
import { paymentService } from "../services/paymentService";



export const refundRouter = Router();

// Create a refund request
refundRouter.post("/api/orders/:orderId/refund", async (req, res) => {
    try {
        if (!req.isAuthenticated()) return res.sendStatus(401);
        const user = req.user as any;

        const orderId = parseInt(req.params.orderId);
        if (isNaN(orderId)) return res.status(400).send("Invalid order ID");

        const order = await orderRepository.getById(orderId);
        if (!order) return res.status(404).send("Order not found");

        if (order.userId !== user.id && user.role !== "admin") {
            return res.status(403).send("Unauthorized");
        }

        // Validate request body
        // We need a custom schema validation here since schema.ts doesn't have items in insertRefundSchema
        // We'll trust the body structure for items for now or add simple check
        const { reason, description, refundMethod, items } = req.body;

        let amount = order.totalAmount; // Default to full amount
        let refundItemsData: { orderItemId: number; quantity: number; reason?: string }[] = [];

        if (items && Array.isArray(items) && items.length > 0) {
            // Partial Refund Logic
            // 1. Fetch Order Items to get prices
            const orderItemsList = await orderRepository.getOrderItems(orderId);

            let calculatedAmount = 0;
            refundItemsData = items.map((item: any) => {
                const orderItem = orderItemsList.find(oi => oi.id === item.orderItemId);
                if (!orderItem) throw new Error(`Invalid order item ID: ${item.orderItemId}`);

                // Validate quantity
                if (item.quantity > orderItem.quantity) throw new Error(`Invalid quantity for item ${orderItem.productId}`);

                calculatedAmount += Number(orderItem.price) * item.quantity;

                return {
                    orderItemId: item.orderItemId,
                    quantity: item.quantity,
                    reason: item.reason
                };
            });

            amount = calculatedAmount.toFixed(2);
        }

        const refundAmountNum = parseFloat(amount.toString());
        const previouslyRefunded = await refundRepository.getRefundedAmountForOrder(orderId);
        const orderTotal = parseFloat(order.totalAmount);

        if (previouslyRefunded + refundAmountNum > orderTotal) {
            return res.status(400).json({
                error: "Refund amount exceeds refundable balance",
                orderTotal,
                previouslyRefunded,
                requested: refundAmountNum,
                remaining: orderTotal - previouslyRefunded
            });
        }

        const refund = await refundRepository.createRefund({
            userId: user.id,
            orderId,
            reason,
            description,
            refundMethod: refundMethod || "original",
            amount: amount.toString(),
            items: refundItemsData
        });

        // Initialize State Machine Tracking
        const { RefundStateMachine, RefundState } = await import("../services/payment/RefundStateMachine");
        await RefundStateMachine.transition({
            refundId: refund.id,
            toState: RefundState.INITIATED,
            triggeredBy: "user",
            reason: reason
        });

        res.status(201).json(refund);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json(error.errors);
        }
        console.error("Refund create error:", error);
        res.status(500).send("Failed to create refund request");
    }
});

// Get current user's refunds
refundRouter.get("/api/refunds", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const refunds = await refundRepository.getRefundsByUser(user.id);
    res.json(refunds);
});

// Admin: Get all refunds
refundRouter.get("/api/admin/refunds", restrictTo("admin", "manager"), async (req, res) => {
    const refunds = await refundRepository.getAllRefundsAdmin();
    res.json(refunds);
});

// Admin: Update refund status
refundRouter.patch("/api/admin/refunds/:id/status", restrictTo("admin", "manager"), async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).send("Invalid refund ID");

    try {
        const { status, adminNote } = updateRefundStatusSchema.parse(req.body);

        const currentRefund = await refundRepository.getRefundById(id);
        if (!currentRefund) return res.status(404).send("Refund not found");

        const updated = await refundRepository.updateRefundStatus(id, status, adminNote);
        if (!updated) return res.status(404).send("Refund not found");

        // Sync with State Machine
        // Map legacy status to RefundState
        const { RefundStateMachine, RefundState } = await import("../services/payment/RefundStateMachine");
        let newState = RefundState.PENDING;
        const s = status as string;
        if (s === "approved" || s === "completed") newState = RefundState.SUCCESS;
        else if (s === "rejected" || s === "cancelled") newState = RefundState.CANCELLED;
        else if (s === "processing") newState = RefundState.PROCESSING;
        else if (s === "failed") newState = RefundState.FAILED;

        await RefundStateMachine.transition({
            refundId: id,
            toState: newState,
            triggeredBy: "admin",
            reason: adminNote
        });

        // Wallet Logic: If approved and method is wallet
        if (status === "approved" && currentRefund.refundMethod === "wallet" && currentRefund.status !== "approved") {
            await WalletService.creditWallet(
                currentRefund.userId,
                Number(currentRefund.amount),
                `refund_${id}`,
                `Refund for Order #${currentRefund.orderId}`
            );
        }

        // Payment Gateway Logic: If approved and method is original
        if (status === "approved" && currentRefund.refundMethod === "original" && currentRefund.status !== "approved") {
            // Find payment record
            const payment = await db.query.payments.findFirst({
                where: eq(payments.orderId, currentRefund.orderId)
            });

            if (payment && payment.gatewayReference && payment.gateway) {
                try {
                    await paymentService.refundPayment(
                        payment.gatewayReference,
                        Number(currentRefund.amount),
                        payment.gateway as "stripe" | "razorpay"
                    );

                    // Log success
                    await AuditService.logAction((req.user as any).id, "REFUND_GATEWAY_SUCCESS", "PAYMENT", payment.id, { refundId: id });
                } catch (err: any) {
                    // Log failure but don't fail the whole request (refund is already marked approved in DB)
                    console.error("Gateway refund failed:", err);
                    await AuditService.logAction((req.user as any).id, "REFUND_GATEWAY_FAILED", "PAYMENT", payment.id, { error: err.message });
                }
            } else {
                console.warn(`No valid payment record found for Order #${currentRefund.orderId} to process original refund.`);
            }
        }

        // Audit Log
        if (req.user) {
            await AuditService.logAction(
                (req.user as any).id,
                "UPDATE_REFUND_STATUS",
                "REFUND",
                id,
                { status, adminNote }
            );
        }

        // Notify User
        const refund = await refundRepository.getRefundById(id);
        if (refund) {
            const userToNotify = await userRepository.findById(refund.userId);
            if (userToNotify) {
                await NotificationService.notifyRefundUpdate(userToNotify.email, id, status, userToNotify.name);
            }
        }

        res.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.log(error);
            return res.status(400).json(error.errors);
        }
        res.status(500).send("Failed to update refund status");
    }
});
