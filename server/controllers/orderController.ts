import { Request, Response } from "express";
import { api } from "@shared/routes";
import { orderRepository } from "../repositories/orderRepository";
import { cartRepository } from "../repositories/cartRepository";
import { productRepository } from "../repositories/productRepository";
import { userRepository } from "../repositories/userRepository";
import { emailService } from "../services/email";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { AuditService } from "../services/auditService";
import { NotificationService } from "../services/notificationService";

export class OrderController {

    // === CART ===
    static getCart = catchAsync(async (req: Request, res: Response) => {
        let cart;
        if (req.user) {
            cart = await cartRepository.getCart((req.user as any).id);
        } else {
            const sessionId = req.sessionID;
            cart = await cartRepository.getCart(undefined, sessionId);
        }
        res.json(cart.map((c: any) => ({ item: c, product: c.product })));
    });

    static addToCart = catchAsync(async (req: Request, res: Response) => {
        const { productId, quantity, size, color } = api.cart.add.input.parse(req.body);
        const userId = req.user ? (req.user as any).id : undefined;
        const sessionId = req.sessionID;

        await cartRepository.addToCart({
            userId,
            sessionId: userId ? null : sessionId,
            productId,
            quantity,
            size: size || null,
            color: color || null
        });
        // Return the updated cart after adding the item (consistent with frontend expectation)
        const cart = await cartRepository.getCart(userId, userId ? undefined : sessionId);
        res.json(cart.map((c: any) => ({ item: c, product: c.product })));
    });

    static updateCartItem = catchAsync(async (req: Request, res: Response) => {
        const { quantity } = api.cart.update.input.parse(req.body);
        const updated = await cartRepository.updateCartItem(Number(req.params.id), quantity);
        if (!updated) throw new AppError("Cart item not found", 404);
        res.json(updated);
    });

    static removeFromCart = catchAsync(async (req: Request, res: Response) => {
        await cartRepository.removeFromCart(Number(req.params.id));
        res.status(204).send();
    });

    // === ORDERS ===
    static createOrder = catchAsync(async (req: Request, res: Response) => {
        if (!req.isAuthenticated()) throw new AppError("Login required", 401);

        const { shippingAddress, couponCode } = api.orders.create.input.parse(req.body);
        const userId = (req.user as any).id;

        // Get cart items to convert to order
        const cartItems = await cartRepository.getCart(userId);
        if (cartItems.length === 0) throw new AppError("Cart empty", 400);

        const totalAmount = cartItems.reduce((sum: number, item: any) => sum + (Number(item.product.price) * item.quantity), 0);
        // TODO: Apply coupon code logic here if needed

        // Check stock before creating order
        for (const item of cartItems) {
            if (item.product.stockQuantity < item.quantity) {
                throw new AppError(`Insufficient stock for ${item.product.name}`, 400);
            }
        }

        const order = await orderRepository.createOrder({
            userId,
            totalAmount: totalAmount.toString(),
            shippingAddress
        }, cartItems.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: Number(item.product.price),
            size: item.size ?? undefined,
            color: item.color ?? undefined
        })));

        // Clear cart
        // Using clearCart method instead of loop
        // But since I added clearCart to repository I should use it, but wait, 
        // I only added it to CartRepository just now. 
        // And I need to verify if removeFromCart handles single item deletion only.
        // Yes. So efficient way is clearCart.

        // Actually I should use clearCart for the user.
        // Ensure all items in cart are removed or just by user_id.
        await cartRepository.clearCart(userId);

        // Send Order Confirmation
        const user = await userRepository.findById(userId);
        if (user) {
            emailService.sendOrderConfirmation({
                email: user.email,
                name: user.name,
            }, {
                id: order.id,
                totalAmount: order.totalAmount,
                items: cartItems.map((item: any) => ({
                    name: item.product.name,
                    quantity: item.quantity,
                    price: item.product.price
                }))
            });
        }

        res.status(201).json(order);
    });

    static listOrders = catchAsync(async (req: Request, res: Response) => {
        if (!req.isAuthenticated()) throw new AppError("Login required", 401);

        if ((req.user as any).role === 'admin') {
            const orders = await orderRepository.getAllOrders();
            return res.json(orders);
        }

        const orders = await orderRepository.getOrders((req.user as any).id);
        res.json(orders);
    });

    static getAllOrders = catchAsync(async (req: Request, res: Response) => {
        if (!req.isAuthenticated() || (req.user as any).role !== 'admin') {
            throw new AppError("Admin access required", 403);
        }
        const orders = await orderRepository.getAllOrders();
        res.json(orders);
    });

    static updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
        const id = parseInt(req.params.id as string);
        const { status } = req.body;

        if (!["pending", "paid", "shipped", "delivered", "cancelled"].includes(status)) {
            throw new AppError("Invalid status", 400);
        }

        const updated = await orderRepository.updateOrderStatus(id, status);
        if (!updated) throw new AppError("Order not found", 404);

        // Audit Log
        if (req.user) {
            await AuditService.logAction(
                (req.user as any).id,
                "UPDATE_ORDER_STATUS",
                "ORDER",
                id,
                { status }
            );
        }

        // Notify User
        // Need to fetch user email. updated order might need to join user or we fetch user.
        // Assuming updated order has userId.
        const user = await userRepository.findById(updated.userId);
        if (user) {
            await NotificationService.notifyOrderStatusChange(user.email, id, status, user.name);
        }

        res.json(updated);
    });
}
