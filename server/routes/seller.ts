import { Router } from "express";

export const sellerRouter = Router();

// Stub for seller routes
sellerRouter.get("/api/seller", (req, res) => {
    res.json({ message: "Seller API available" });
});
