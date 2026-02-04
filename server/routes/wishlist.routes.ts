import { Router } from "express";
import { UserController } from "../controllers/userController";
import { requireAuth } from "../middleware/auth";
import { api } from "@shared/routes";

export const wishlistRouter = Router();

// Get wishlist items
wishlistRouter.get(
    "/api/wishlist",
    requireAuth,
    UserController.getWishlist
);

// Add item to wishlist
wishlistRouter.post(
    "/api/wishlist",
    requireAuth,
    UserController.addToWishlist
);

// Remove item from wishlist
wishlistRouter.delete(
    "/api/wishlist/:productId",
    requireAuth,
    UserController.removeFromWishlist
);

// Check if item is in wishlist
wishlistRouter.get(
    "/api/wishlist/check/:productId",
    requireAuth,
    UserController.checkWishlist
);
