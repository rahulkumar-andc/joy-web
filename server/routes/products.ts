import { Router } from "express";
import { api } from "@shared/routes";
import { requireAuth } from "../middleware/auth";
import { restrictTo } from "../middleware/rbac";
import { upload } from "../upload";
import { ProductController } from "../controllers/productController";

export const productsRouter = Router();

// === PRODUCT ROUTES ===
productsRouter.get(api.products.list.path, ProductController.listProducts);

productsRouter.get(api.products.get.path, ProductController.getProduct);

productsRouter.post(api.products.create.path, requireAuth, restrictTo("admin", "manager", "seller"), ProductController.createProduct);

productsRouter.patch(api.products.update.path, requireAuth, restrictTo("admin", "manager", "seller"), ProductController.updateProduct);

productsRouter.delete(api.products.delete.path, requireAuth, restrictTo("admin", "manager"), ProductController.deleteProduct);

// === CATEGORY ROUTES ===
productsRouter.get(api.categories.list.path, ProductController.listCategories);

// === REVIEWS ROUTES ===
productsRouter.get("/api/products/:productId/reviews", ProductController.listReviews);

productsRouter.post("/api/products/:productId/reviews", requireAuth, ProductController.createReview);

productsRouter.get("/api/products/:productId/rating", ProductController.getRating);

// === REVIEW HELPFUL VOTE ===
productsRouter.post("/api/reviews/:reviewId/helpful", requireAuth, ProductController.voteHelpful);

// === BOUGHT TOGETHER ===
productsRouter.get("/api/products/:productId/bought-together", ProductController.getBoughtTogether);

// === UPLOAD ROUTE ===
productsRouter.post("/api/products/upload", requireAuth, restrictTo("admin", "manager", "seller"), upload.single("image"), ProductController.uploadImage);

// === BULK IMPORT/EXPORT ===
productsRouter.post("/api/products/bulk", requireAuth, restrictTo("admin", "manager"), upload.single("file"), ProductController.bulkImport);
productsRouter.get("/api/products/export", requireAuth, restrictTo("admin", "manager"), ProductController.exportProducts);
productsRouter.get("/api/products/template", requireAuth, restrictTo("admin", "manager"), ProductController.getTemplate);
