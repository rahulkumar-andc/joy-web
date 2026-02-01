import { Router } from "express";
import { resellerController } from "./reseller.controller";

const router = Router();

// === PUBLIC ROUTES ===

// Share link redirect (public)
router.get("/r/:shortCode", (req, res, next) =>
    resellerController.handleShareLink(req, res, next)
);

// === AUTHENTICATED RESELLER ROUTES ===

// Join as reseller
router.post("/api/reseller/join", (req, res, next) =>
    resellerController.becomeReseller(req, res, next)
);

// Get reseller profile
router.get("/api/reseller/profile", (req, res, next) =>
    resellerController.getProfile(req, res, next)
);

// Get reseller dashboard with stats
router.get("/api/reseller/dashboard", (req, res, next) =>
    resellerController.getDashboard(req, res, next)
);

// Update bank details
router.patch("/api/reseller/bank", (req, res, next) =>
    resellerController.updateBankDetails(req, res, next)
);

// Update UPI ID
router.patch("/api/reseller/upi", (req, res, next) =>
    resellerController.updateUpi(req, res, next)
);

// === PRODUCT LINKS ===

// Create share link
router.post("/api/reseller/links", (req, res, next) =>
    resellerController.createLink(req, res, next)
);

// Get all links
router.get("/api/reseller/links", (req, res, next) =>
    resellerController.getLinks(req, res, next)
);

// === CATALOG ===

// Get resellable products catalog
router.get("/api/reseller/catalog", (req, res, next) =>
    resellerController.getCatalog(req, res, next)
);

// === COMMISSIONS ===

// Get commissions
router.get("/api/reseller/commissions", (req, res, next) =>
    resellerController.getCommissions(req, res, next)
);

// === PAYOUTS ===

// Request payout
router.post("/api/reseller/payouts", (req, res, next) =>
    resellerController.requestPayout(req, res, next)
);

// Get payouts history
router.get("/api/reseller/payouts", (req, res, next) =>
    resellerController.getPayouts(req, res, next)
);

// === ADMIN ROUTES ===

// Get all resellers
router.get("/api/admin/resellers", (req, res, next) =>
    resellerController.getAllResellers(req, res, next)
);

// Approve reseller
router.post("/api/admin/resellers/:id/approve", (req, res, next) =>
    resellerController.approveReseller(req, res, next)
);

// Suspend reseller
router.post("/api/admin/resellers/:id/suspend", (req, res, next) =>
    resellerController.suspendReseller(req, res, next)
);

// Clear fraud flag
router.post("/api/admin/resellers/:id/clear-flag", (req, res, next) =>
    resellerController.clearFlag(req, res, next)
);

// Get all payouts
router.get("/api/admin/payouts", (req, res, next) =>
    resellerController.getAllPayouts(req, res, next)
);

// Complete payout
router.post("/api/admin/payouts/:id/complete", (req, res, next) =>
    resellerController.completePayout(req, res, next)
);

// Mark payout failed
router.post("/api/admin/payouts/:id/fail", (req, res, next) =>
    resellerController.failPayout(req, res, next)
);

export default router;
