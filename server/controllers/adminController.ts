import { Request, Response } from "express";
import { analyticsService } from "../services/analyticsService";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import { sellerProductService } from "../services/seller/sellerProductService";
import { sellerOnboardingService } from "../services/seller/sellerOnboardingService";
import { sellerPayoutService } from "../services/seller/sellerPayoutService";
import { userService } from "../services/userService";

export class AdminController {

    static getUsers = catchAsync(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const role = req.query.role as string;
        const search = req.query.search as string;

        const result = await userService.getAllUsers({ role, search }, page, limit);
        res.json(result);
    });

    static manageUser = catchAsync(async (req: Request, res: Response) => {
        const userId = parseInt(req.params.id as string);
        const { role, isVerified } = req.body;
        const adminId = (req.user as any).id;

        const result = await userService.manageUser(userId, adminId, { role, isVerified });

        if (!result.success) {
            return res.status(400).json({ error: (result as any).error || "Update failed" });
        }

        res.json(result);
    });

    static getPayouts = catchAsync(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as any;
        const search = req.query.search as string;

        const result = await sellerPayoutService.getPayouts({ status, search }, page, limit);
        res.json(result);
    });

    static managePayout = catchAsync(async (req: Request, res: Response) => {
        const payoutId = parseInt(req.params.id as string);
        const { action, note } = req.body;
        const adminId = (req.user as any).id;

        const result = await sellerPayoutService.managePayout(payoutId, adminId, action, note);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json(result);
    });

    static getSellers = catchAsync(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as any;
        const search = req.query.search as string;

        const result = await sellerOnboardingService.getAllSellers({ status, search }, page, limit);
        res.json(result);
    });

    static manageSeller = catchAsync(async (req: Request, res: Response) => {
        const sellerId = parseInt(req.params.sellerId as string);
        const { action, reason } = req.body;
        const adminId = (req.user as any).id;

        let result;
        switch (action) {
            case "approve":
                result = await sellerOnboardingService.approveSeller(sellerId, adminId);
                break;
            case "reject":
                result = await sellerOnboardingService.rejectSeller(sellerId, adminId, reason);
                break;
            case "suspend":
                result = await sellerOnboardingService.suspendSeller(sellerId, adminId, reason);
                break;
            case "blacklist":
                result = await sellerOnboardingService.blacklistSeller(sellerId, adminId, reason);
                break;
            case "reactivate":
                result = await sellerOnboardingService.reactivateSeller(sellerId, adminId);
                break;
            default:
                return res.status(400).json({ error: "Invalid action" });
        }

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.json(result);
    });

    static getPendingProducts = catchAsync(async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await sellerProductService.getPendingProducts(page, limit);
        res.json(result);
    });

    static getCustomerProfile = catchAsync(async (req: Request, res: Response) => {
        const userId = parseInt(req.params.id as string);
        const profile = await analyticsService.getCustomerProfile(userId);
        if (!profile) {
            throw new AppError("Customer not found", 404);
        }
        res.json(profile);
    });

    static getStats = catchAsync(async (req: Request, res: Response) => {
        const orderStats = await analyticsService.getOrderStats();
        // Format for frontend: count by status
        const stats = orderStats.reduce((acc: any, curr) => {
            acc[curr.status || "unknown"] = curr.count;
            return acc;
        }, {});
        res.json(stats);
    });

    static getDashboardStats = catchAsync(async (req: Request, res: Response) => {
        const [orderStats, productStats, userStats, dailySales] = await Promise.all([
            analyticsService.getOrderStats(),
            analyticsService.getProductStats(),
            analyticsService.getUserStats(),
            analyticsService.getDailySales(30)
        ]);

        // Transform results
        const ordersByStatus = orderStats.reduce((acc: any, curr: { status: string | null; count: number }) => {
            acc[curr.status || "unknown"] = Number(curr.count);
            return acc;
        }, {});

        const productsByStatus = productStats.reduce((acc: any, curr: { status: string | null; count: number }) => {
            acc[curr.status || "unknown"] = Number(curr.count);
            return acc;
        }, {});

        const usersByRole = userStats.reduce((acc: any, curr: { role: string | null; count: number }) => {
            acc[curr.role || "unknown"] = Number(curr.count);
            return acc;
        }, {});

        // Calculate derived stats
        const totalRevenue = (dailySales as any[]).reduce((sum: number, day: { total: number }) => sum + Number(day.total), 0);
        const totalOrders = Object.values(ordersByStatus).reduce((a: any, b: any) => Number(a) + Number(b), 0);

        res.json({
            orders: ordersByStatus,
            products: productsByStatus,
            users: usersByRole,
            revenue: {
                total: totalRevenue,
                daily: dailySales
            },
            overview: {
                totalOrders,
                activeProducts: productsByStatus['approved'] || 0,
                pendingProducts: productsByStatus['pending'] || 0,
                totalSellers: usersByRole['seller'] || 0,
                totalUsers: usersByRole['user'] || 0
            }
        });
    });

    static getDailySales = catchAsync(async (req: Request, res: Response) => {
        const days = req.query.days ? parseInt(req.query.days as string) : 7;
        const sales = await analyticsService.getDailySales(days);
        res.json(sales);
    });

    static getTopProducts = catchAsync(async (req: Request, res: Response) => {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
        const products = await analyticsService.getTopProducts(limit);
        res.json(products);
    });

    static getRevenueAnalytics = catchAsync(async (req: Request, res: Response) => {
        // Reuse daily sales for now as revenue analytics
        const days = req.query.days ? parseInt(req.query.days as string) : 30;
        const revenue = await analyticsService.getDailySales(days);
        res.json(revenue);
    });
}
