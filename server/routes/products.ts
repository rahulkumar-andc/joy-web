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

productsRouter.post(api.products.create.path, restrictTo("admin", "manager", "seller"), ProductController.createProduct);

productsRouter.patch(api.products.update.path, restrictTo("admin", "manager", "seller"), ProductController.updateProduct);

productsRouter.delete(api.products.delete.path, restrictTo("admin", "manager"), ProductController.deleteProduct);

// === CATEGORY ROUTES ===
productsRouter.get(api.categories.list.path, ProductController.listCategories);

// === REVIEWS ROUTES ===
productsRouter.get("/api/products/:productId/reviews", ProductController.listReviews);

productsRouter.post("/api/products/:productId/reviews", requireAuth, ProductController.createReview);

productsRouter.get("/api/products/:productId/rating", ProductController.getRating);

// === UPLOAD ROUTE ===
productsRouter.post("/api/products/upload", restrictTo("admin", "manager", "seller"), upload.single("image"), ProductController.uploadImage);

// === BULK IMPORT/EXPORT ===
productsRouter.post("/api/products/bulk", restrictTo("admin", "manager"), upload.single("file"), ProductController.bulkImport);
productsRouter.get("/api/products/export", restrictTo("admin", "manager"), ProductController.exportProducts);

