
import "dotenv/config";
import { db } from "../server/db";
import { analyticsService } from "../server/services/analyticsService";
import { sellerOrderService } from "../server/services/seller/sellerOrderService";
import { resellerService } from "../server/modules/reseller/reseller.service";
import { shippingAnalyticsService } from "../server/services/shippingAnalyticsService";
import { AdminController } from "../server/controllers/adminController";
import { sellerOnboardingService } from "../server/services/seller/sellerOnboardingService";
import { logger } from "../server/logger";

// Mock Express Response
const mockRes = () => {
    const res: any = {};
    res.status = (code: number) => {
        // console.log(`  -> Status: ${code}`);
        return res;
    };
    res.json = (data: any) => {
        // console.log("  -> Response data keys:", Object.keys(data));
        return res;
    };
    return res;
};

// Mock Express Request
const mockReq = (query: any = {}, params: any = {}, body: any = {}, user: any = { id: 1 }) => ({
    query,
    params,
    body,
    user
} as any);

async function runVerification() {
    console.log("=== PERFORMANCE MONITORING VERIFICATION ===\n");

    try {
        console.log("1. Testing AnalyticsService...");
        console.log("- getOpsStats");
        await analyticsService.getOpsStats();
        console.log("- getDailySales");
        await analyticsService.getDailySales(7);
        console.log("- getOrderStats");
        await analyticsService.getOrderStats();
        console.log("- getProductStats");
        await analyticsService.getProductStats();
        console.log("- getUserStats");
        await analyticsService.getUserStats();

        // Use a known user ID if possible, otherwise skip or use 1
        console.log("- getCustomerProfile (ID: 1)");
        await analyticsService.getCustomerProfile(1);

        console.log("\n2. Testing SellerOrderService...");
        // Use a known seller ID if possible
        // Let's find a seller first
        const sellers = await sellerOnboardingService.getAllSellers({});
        const sellerId = sellers.sellers[0]?.id || 1;
        console.log(`- getSellerOrderStats (Seller ID: ${sellerId})`);
        await sellerOrderService.getSellerOrderStats(sellerId);
        console.log(`- getDailySales (Seller ID: ${sellerId})`);
        await sellerOrderService.getDailySales(sellerId);
        console.log("- getAllSellerOrders");
        await sellerOrderService.getAllSellerOrders({});

        console.log("\n3. Testing ResellerService...");
        const resellers = await db.query.resellers.findFirst();
        if (resellers) {
            console.log(`- getResellerDashboard (Reseller ID: ${resellers.id})`);
            await resellerService.getResellerDashboard(resellers.id);
        } else {
            console.log("- No resellers found, skipping getResellerDashboard");
        }

        console.log("\n4. Testing ShippingAnalyticsService...");
        console.log("- getAnalytics");
        await shippingAnalyticsService.getAnalytics(30);

        console.log("\n5. Testing SellerOnboardingService...");
        console.log("- getAllSellers");
        await sellerOnboardingService.getAllSellers({});

        console.log("\n6. Testing AdminController Aggregations...");

        console.log("- getDashboardStats");
        // We need to properly invoke the controller method. 
        // AdminController.getDashboardStats is a request handler (wrapped by catchAsync).
        // It takes (req, res, next).
        await AdminController.getDashboardStats(mockReq(), mockRes(), () => { });

        console.log("- getBusinessStats");
        await AdminController.getBusinessStats(mockReq(), mockRes(), () => { });

        console.log("- getOpsStats");
        await AdminController.getOpsStats(mockReq(), mockRes(), () => { });

        console.log("\n=== VERIFICATION COMPLETE ===");
        console.log("Check logs above for [Performance] entries.");

    } catch (error) {
        console.error("Verification failed:", error);
    } finally {
        process.exit(0);
    }
}

runVerification();
