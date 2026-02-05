import { Request, Response } from "express";
import { productRepository } from "../repositories/productRepository";
import { reviewRepository } from "../repositories/reviewRepository";
import { orderRepository } from "../repositories/orderRepository";
import { cacheService, CacheKeys, CacheTTL } from "../cache";
import { api } from "@shared/routes";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import fs from "fs";
import { parseCsv } from "../lib/csv";
import { logger } from "../logger";
import { insertProductSchema } from "@shared/schema";
import { AuditService } from "../services/auditService";
import { sanitizeHtml } from "../utils/sanitize";
import { imagekitService } from "../services/imagekitService";
import { boughtTogetherService } from "../services/boughtTogetherService";

export class ProductController {

    static listProducts = catchAsync(async (req: Request, res: Response) => {
        const getQueryParam = (param: unknown): string | undefined => {
            if (typeof param === 'string') return param;
            return undefined;
        };

        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;

        const filters = {
            category: getQueryParam(req.query.category),
            search: getQueryParam(req.query.search),
            sort: getQueryParam(req.query.sort),
            page,
            limit
        };

        const cacheKey = CacheKeys.PRODUCTS_LIST(page, limit, JSON.stringify(filters));

        const result = await cacheService.getOrSet(
            cacheKey,
            () => productRepository.findAll(filters),
            CacheTTL.SHORT // Keep short for lists as inventory changes
        );

        res.json(result);
    });

    static getProduct = catchAsync(async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        const product = await cacheService.getOrSet(
            CacheKeys.PRODUCT_DETAIL(id),
            async () => {
                const p = await productRepository.findById(id);
                if (!p) throw new AppError("Product not found", 404);
                return p;
            },
            CacheTTL.MEDIUM
        );
        res.json(product);
    });

    static uploadImage = catchAsync(async (req: Request, res: Response) => {
        logger.info(`[Upload Debug] Upload request received. User: ${JSON.stringify(req.user)}`);
        if (!req.file) {
            throw new AppError("No file uploaded", 400);
        }

        try {
            // Read file buffer
            const fileBuffer = await fs.promises.readFile(req.file.path);

            // Upload to ImageKit
            const result = await imagekitService.uploadImage({
                file: fileBuffer,
                fileName: req.file.filename,
                folder: '/products'
            });

            // Delete local file
            await fs.promises.unlink(req.file.path).catch(err => {
                logger.error("Failed to delete local file after upload", err);
            });

            // Return the public URL from ImageKit
            res.status(200).json({ url: result.url, filename: result.name });
        } catch (error) {
            // Cleanup local file on error
            if (req.file) {
                await fs.promises.unlink(req.file.path).catch(() => { });
            }
            throw new AppError("Image upload failed: " + (error as Error).message, 500);
        }
    });

    static createProduct = catchAsync(async (req: Request, res: Response) => {
        logger.info(`[Product Create Debug] Payload: ${JSON.stringify(req.body)}`);

        try {
            const input = api.products.create.input.parse(req.body);
            const sellerId = req.user ? (req.user as any).id : null;

            // ⚠️ Sanitize HTML in description to prevent XSS
            const sanitizedInput = {
                ...input,
                description: input.description ? sanitizeHtml(input.description) : input.description
            };

            const product = await productRepository.create({
                ...sanitizedInput,
                sellerId, // Add sellerId to repository call
                sellerName: (req.user as any).name, // Denormalize seller name
                moderationStatus: "approved" // Auto-approve so it shows on homepage
            });
            await cacheService.invalidateProducts();

            if (req.user) {
                await AuditService.logAction(
                    (req.user as any).id,
                    "CREATE_PRODUCT",
                    "PRODUCT",
                    product.id,
                    { name: product.name }
                );
            }

            res.status(201).json(product);
        } catch (error) {
            logger.error(`[Product Create Error] Failed: ${error}`);
            throw error;
        }
    });

    static updateProduct = catchAsync(async (req: Request, res: Response) => {
        const input = api.products.update.input.parse(req.body);
        const product = await productRepository.update(Number(req.params.id), input);
        if (!product) throw new AppError("Product not found", 404);
        await cacheService.invalidateProducts();

        if (req.user) {
            await AuditService.logAction(
                (req.user as any).id,
                "UPDATE_PRODUCT",
                "PRODUCT",
                product.id,
                { updates: Object.keys(input) }
            );
        }

        res.json(product);
    });

    static deleteProduct = catchAsync(async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        await productRepository.delete(id);
        await cacheService.invalidateProducts();

        if (req.user) {
            await AuditService.logAction(
                (req.user as any).id,
                "DELETE_PRODUCT",
                "PRODUCT",
                id
            );
        }

        res.status(204).send();
    });

    static listCategories = catchAsync(async (req: Request, res: Response) => {
        const cached = await cacheService.get(CacheKeys.CATEGORIES);
        if (cached) return res.json(cached);

        const categories = await productRepository.getCategories();
        await cacheService.set(CacheKeys.CATEGORIES, categories, 3600);
        res.json(categories);
    });

    // Reviews
    static listReviews = catchAsync(async (req: Request, res: Response) => {
        const reviews = await reviewRepository.getProductReviews(parseInt(req.params.productId as string));
        const reviewData = reviews.map((r: any) => ({
            ...r,
            user: { name: r.user.name }
        }));
        res.json(reviewData);
    });

    static createReview = catchAsync(async (req: Request, res: Response) => {
        const input = api.reviews.create.input.parse(req.body);
        const userId = (req.user as any).id;
        const productId = parseInt(req.params.productId as string);

        // Check if user has purchased this product
        const verifiedPurchase = await orderRepository.hasUserPurchasedProduct(userId, productId);

        // ⚠️ Sanitize review comment to prevent XSS
        const review = await reviewRepository.create({
            userId,
            productId,
            rating: input.rating,
            comment: input.comment ? sanitizeHtml(input.comment) : input.comment,
            title: (input as any).title,
            images: (input as any).images,
            verifiedPurchase,
        });
        res.status(201).json(review);
    });

    static voteHelpful = catchAsync(async (req: Request, res: Response) => {
        const reviewId = parseInt(req.params.reviewId as string);
        const userId = (req.user as any).id;

        const result = await reviewRepository.voteHelpful(reviewId, userId);

        if (!result.success) {
            return res.status(200).json({
                message: "Already voted",
                helpfulCount: result.helpfulCount
            });
        }

        res.json({
            message: "Vote recorded",
            helpfulCount: result.helpfulCount
        });
    });

    static getBoughtTogether = catchAsync(async (req: Request, res: Response) => {
        const productId = parseInt(req.params.productId as string);

        const cacheKey = `bought-together:${productId}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return res.json(cached);

        const products = await boughtTogetherService.getBoughtTogether(productId);

        await cacheService.set(cacheKey, products, 3600); // 1 hour cache
        res.json(products);
    });

    static getRating = catchAsync(async (req: Request, res: Response) => {
        const productId = parseInt(req.params.productId as string);

        // Use cache for rating distribution (15 minute TTL)
        const cacheKey = `product:rating:${productId}`;
        const cached = await cacheService.get(cacheKey);
        if (cached) return res.json(cached);

        const distribution = await reviewRepository.getRatingDistribution(productId);

        await cacheService.set(cacheKey, distribution, 900); // 15 minutes
        res.json(distribution);
    });

    // Bulk Import
    static bulkImport = catchAsync(async (req: Request, res: Response) => {
        if (!req.file) {
            throw new AppError("No CSV file uploaded", 400);
        }

        try {
            const buffer = await fs.promises.readFile(req.file.path);
            const rows = await parseCsv(buffer);

            const successful = [];
            const failed = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    // Normalization
                    const productData = {
                        ...row,
                        price: row.price?.toString(),
                        stockQuantity: Number(row.stockQuantity) || 0,
                        images: typeof row.images === 'string' ? row.images.split(',').map((s: string) => s.trim()) : row.images,
                        categoryId: Number(row.categoryId) || undefined,
                        id: undefined,
                        createdAt: undefined
                    };

                    const validated = insertProductSchema.parse(productData);
                    successful.push(validated);
                } catch (err: any) {
                    failed.push({ row: i + 2, error: err.issues?.[0]?.message || err.message, data: row });
                }
            }

            if (successful.length > 0) {
                await productRepository.bulkCreate(successful);
                await cacheService.invalidateProducts();
            }

            // Cleanup
            await fs.promises.unlink(req.file.path);

            res.json({
                importedCount: successful.length,
                failedCount: failed.length,
                failedDetails: failed
            });

        } catch (err) {
            logger.error("Bulk import failed: " + err);
            throw new AppError("Failed to process CSV file", 500);
        }
    });

    static exportProducts = catchAsync(async (req: Request, res: Response) => {
        const products = await productRepository.findAll({ limit: 10000 }); // High limit for export
        const csvHeaders = ["id", "name", "price", "stockQuantity", "categoryId", "description", "images"];

        // Escape specific characters for CSV
        const escapeCsv = (field: any) => {
            if (field === null || field === undefined) return '';
            const stringField = String(field);
            if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
        };

        // findAll returns { products: [], total: number }
        const csvRows = products.products.map((p: any) => {
            return [
                p.id,
                p.name,
                p.price,
                p.stockQuantity,
                p.categoryId,
                p.description,
                (p.images || []).join(',')
            ].map(escapeCsv).join(',');
        });

        const csvContent = [csvHeaders.join(',')].concat(csvRows).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
        res.status(200).send(csvContent);
    });
}
