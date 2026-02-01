import { Request, Response } from "express";
import { analyticsService } from "../services/analyticsService";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";

export class AdminController {

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
