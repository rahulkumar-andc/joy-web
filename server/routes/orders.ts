// This was targetting routes.ts, but logic is in Controller. 
// I should likely modify the Controller instead of the route if logic is encapsulated there.
// Let's check OrderController content first to see where to inject.
// I'll skip this tool call's effect logic effectively by keeping it same or switch to view_file.
// Actually, I realized the logic is in OrderController.updateOrderStatus. I should edit that file.
// I will abort this specific replace on routes/orders.ts and instead target the controller.
// But to avoid error, I will just touch the import in routes/orders.ts to include the services if needed? 
// No, I should use view_file on the controller first.
import { Router } from "express";
import { api } from "@shared/routes";
import { requireAuth } from "../middleware/auth";
import { restrictTo } from "../middleware/rbac";
import { OrderController } from "../controllers/orderController";

export const cartRouter = Router();
export const orderRouter = Router();

// === CART ROUTES ===
cartRouter.get(api.cart.get.path, OrderController.getCart);

cartRouter.post(api.cart.add.path, OrderController.addToCart);

cartRouter.patch(api.cart.update.path, OrderController.updateCartItem);

cartRouter.delete(api.cart.remove.path, OrderController.removeFromCart);

// === ORDER ROUTES ===
orderRouter.post(api.orders.create.path, OrderController.createOrder);

orderRouter.get(api.orders.list.path, OrderController.listOrders);

// User: Get single order for tracking
orderRouter.get("/api/orders/:id", OrderController.getOrderById);

// Admin: Update Order Status
orderRouter.patch("/api/orders/:id/status", restrictTo("admin", "manager"), OrderController.updateOrderStatus);

// === ADMIN ORDER ROUTES ===
orderRouter.get("/api/admin/orders", requireAuth, restrictTo("admin", "manager"), OrderController.getAllOrders);
