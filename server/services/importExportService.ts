import { parse } from 'csv-parse/sync';
import { productRepository } from '../repositories/productRepository';
import { logger } from '../logger';
import { InsertProduct, InsertCategory, orders, users, orderItems, products } from '@shared/schema';
import { db } from "../db";
import { eq, sql, desc, and, gte, lte } from "drizzle-orm";

export interface ImportResult {
    total: number;
    success: number;
    failed: number;
    errors: string[];
}

export class ImportExportService {

    /**
     * Check if string is a valid URL
     */
    private isValidUrl(str: string): boolean {
        try {
            new URL(str);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Simple Levenshtein distance for fuzzy matching
     */
    private levenshteinDistance(a: string, b: string): number {
        const matrix: number[][] = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    /**
     * Find best matching category using fuzzy match
     */
    private findBestCategoryMatch(input: string, categories: Map<string, number>): { id: number | null; matched: string | null } {
        const inputLower = input.trim().toLowerCase();

        // Exact match first
        if (categories.has(inputLower)) {
            return { id: categories.get(inputLower)!, matched: input };
        }

        // Fuzzy match (threshold: 2 edits)
        let bestMatch: string | null = null;
        let bestDistance = Infinity;

        for (const [catName] of categories.entries()) {
            const distance = this.levenshteinDistance(inputLower, catName);
            if (distance < bestDistance && distance <= 2) {
                bestDistance = distance;
                bestMatch = catName;
            }
        }

        if (bestMatch) {
            return { id: categories.get(bestMatch)!, matched: bestMatch };
        }

        return { id: null, matched: null };
    }

    /**
     * Import products from CSV buffer with enhanced validation
     */
    async importProductsFromCSV(buffer: Buffer): Promise<ImportResult> {
        const result: ImportResult = {
            total: 0,
            success: 0,
            failed: 0,
            errors: []
        };

        try {
            // Parse CSV
            const records = parse(buffer, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            });

            result.total = records.length;

            // Pre-fetch categories for mapping
            const existingCategories = await productRepository.getCategories();
            const categoryMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c.id]));

            const productsTocreate: InsertProduct[] = [];

            interface CSVRow {
                Name: string;
                Price: string;
                Description: string;
                Category?: string;
                Images?: string;
                Sizes?: string;
                Colors?: string;
                Tags?: string;
                Stock?: string;
                Brand?: string;
                DiscountPrice?: string;
                IsFeatured?: string;
            }

            for (let i = 0; i < records.length; i++) {
                const row = records[i] as CSVRow;
                const rowNum = i + 2; // +1 for 0-index, +1 for header
                const rowErrors: string[] = [];

                try {
                    // === ENHANCED VALIDATION ===

                    // Required fields
                    if (!row.Name || row.Name.trim().length === 0) {
                        rowErrors.push("Name is required");
                    }
                    if (!row.Description || row.Description.trim().length < 10) {
                        rowErrors.push("Description must be at least 10 characters");
                    }

                    // Price validation
                    const priceNum = parseFloat(row.Price);
                    if (!row.Price || isNaN(priceNum) || priceNum <= 0) {
                        rowErrors.push(`Invalid Price "${row.Price}" - must be a positive number`);
                    }

                    // Discount price validation (optional)
                    let discountPrice: string | null = null;
                    if (row.DiscountPrice && row.DiscountPrice.trim() !== '') {
                        const discountNum = parseFloat(row.DiscountPrice);
                        if (isNaN(discountNum) || discountNum <= 0) {
                            rowErrors.push(`Invalid DiscountPrice "${row.DiscountPrice}"`);
                        } else if (discountNum >= priceNum) {
                            rowErrors.push(`DiscountPrice (${discountNum}) must be less than Price (${priceNum})`);
                        } else {
                            discountPrice = row.DiscountPrice;
                        }
                    }

                    // Stock validation
                    let stockQty = 0;
                    if (row.Stock && row.Stock.trim() !== '') {
                        stockQty = parseInt(row.Stock, 10);
                        if (isNaN(stockQty) || stockQty < 0) {
                            rowErrors.push(`Invalid Stock "${row.Stock}" - must be a non-negative integer`);
                            stockQty = 0;
                        }
                    }

                    // Image URL validation
                    const images: string[] = [];
                    if (row.Images) {
                        const imgList = row.Images.split('|').map((s: string) => s.trim()).filter(Boolean);
                        for (const imgUrl of imgList) {
                            if (!this.isValidUrl(imgUrl)) {
                                rowErrors.push(`Invalid image URL: "${imgUrl.substring(0, 50)}..."`);
                            } else {
                                images.push(imgUrl);
                            }
                        }
                    }
                    if (images.length === 0) {
                        images.push("https://placehold.co/600x400?text=No+Image");
                    }

                    // === SMART CATEGORY MATCHING ===
                    let categoryId: number | null = null;
                    if (row.Category && row.Category.trim() !== '') {
                        const match = this.findBestCategoryMatch(row.Category, categoryMap);

                        if (match.id) {
                            categoryId = match.id;
                            if (match.matched !== row.Category.trim().toLowerCase()) {
                                // Fuzzy matched - log info
                                logger.info(`Category fuzzy matched: "${row.Category}" -> "${match.matched}" (Row ${rowNum})`);
                            }
                        } else {
                            // Create new category
                            const slug = row.Category.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            const newCat = await productRepository.createCategory({
                                name: row.Category.trim(),
                                slug: slug,
                                description: `Imported category`,
                                imageUrl: null
                            } as InsertCategory);
                            categoryId = newCat.id;
                            categoryMap.set(row.Category.trim().toLowerCase(), categoryId);
                            logger.info(`Created new category during import: ${row.Category}`);
                        }
                    }

                    // If there are validation errors, skip this row
                    if (rowErrors.length > 0) {
                        result.failed++;
                        result.errors.push(`Row ${rowNum}: ${rowErrors.join('; ')}`);
                        continue;
                    }

                    // Parse other arrays
                    const sizes = row.Sizes ? row.Sizes.split('|').map((s: string) => s.trim()).filter(Boolean) : [];
                    const colors = row.Colors ? row.Colors.split('|').map((s: string) => s.trim()).filter(Boolean) : [];
                    const tags = row.Tags ? row.Tags.split('|').map((s: string) => s.trim()).filter(Boolean) : [];

                    const product: InsertProduct = {
                        name: row.Name.trim(),
                        description: row.Description.trim(),
                        mrp: row.Price,
                        stockQuantity: stockQty,
                        categoryId: categoryId,
                        brand: row.Brand?.trim() || null,
                        images: images,
                        sizes: sizes.length ? sizes : null,
                        colors: colors.length ? colors : null,
                        tags: tags.length ? tags : null,
                        salePrice: discountPrice,
                        isFeatured: row.IsFeatured?.toLowerCase() === 'true',
                        showOnHomepage: true
                    };

                    productsTocreate.push(product);

                } catch (err) {
                    result.failed++;
                    result.errors.push(`Row ${rowNum}: ${(err as Error).message}`);
                }
            }

            // Bulk create successful entries
            if (productsTocreate.length > 0) {
                await productRepository.bulkCreate(productsTocreate);
                result.success = productsTocreate.length;
                logger.info(`Successfully imported ${result.success} products`);
            }

        } catch (error) {
            logger.error("CSV Import Error:", error);
            result.errors.push(`System Error: ${(error as Error).message}`);
        }

        return result;
    }

    /**
     * Export products to CSV string
     */
    async exportProductsToCSV(): Promise<string> {
        const { products } = await productRepository.findAllWithCategories({ limit: 10000 }); // Limit for safety

        const header = [
            "ID", "Name", "Description", "Price", "DiscountPrice",
            "Category", "Stock", "Brand", "Images", "Sizes", "Colors", "Tags", "IsFeatured"
        ];

        const csvRows = [header.join(",")];

        for (const p of products) {
            const row = [
                p.id,
                this.escapeCsv(p.name),
                this.escapeCsv(p.description),
                p.mrp,
                p.salePrice || "",
                this.escapeCsv(p.category?.name || ""),
                p.stockQuantity,
                this.escapeCsv(p.brand || ""),
                this.escapeCsv(p.images.join("|")),
                this.escapeCsv(p.sizes?.join("|") || ""),
                this.escapeCsv(p.colors?.join("|") || ""),
                this.escapeCsv(p.tags?.join("|") || ""),
                p.isFeatured ? "true" : "false"
            ];
            csvRows.push(row.join(","));
        }

        return csvRows.join("\n");
    }

    /**
     * Generate empty template CSV for import
     */
    getTemplateCSV(): string {
        const header = [
            "Name", "Description", "Price", "DiscountPrice",
            "Category", "Stock", "Brand", "Images", "Sizes", "Colors", "Tags", "IsFeatured"
        ];

        const exampleRow = [
            "Example T-Shirt",
            "A comfortable cotton t-shirt for everyday wear.",
            "999",
            "799",
            "Men",
            "50",
            "BrandName",
            "https://example.com/image1.jpg|https://example.com/image2.jpg",
            "S|M|L|XL",
            "Red|Blue|Black",
            "summer|casual",
            "true"
        ];

        return [header.join(","), exampleRow.join(",")].join("\n");
    }

    /**
     * Export Orders to CSV
     */
    async exportOrdersToCSV(startDate?: Date, endDate?: Date): Promise<string> {
        let conditions = undefined;
        if (startDate || endDate) {
            const conds = [];
            if (startDate) conds.push(gte(orders.createdAt, startDate));
            if (endDate) conds.push(lte(orders.createdAt, endDate));
            conditions = and(...conds);
        }

        const result = await db
            .select({
                id: orders.id,
                date: orders.createdAt,
                status: orders.status,
                paymentStatus: orders.paymentStatus,
                total: orders.totalAmount,
                userEmail: users.email,
                userName: users.name,
                itemCount: sql<number>`count(${orderItems.id})`
            })
            .from(orders)
            .leftJoin(users, eq(orders.userId, users.id))
            .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
            .where(conditions)
            .groupBy(orders.id, users.email, users.name)
            .orderBy(desc(orders.createdAt));

        const header = ["OrderID", "Date", "User Name", "Email", "Status", "Payment", "Total", "Items"];
        const csvRows = [header.join(",")];

        for (const order of result) {
            const row = [
                order.id,
                order.date ? new Date(order.date).toISOString().split('T')[0] : "",
                this.escapeCsv(order.userName || "Guest"),
                this.escapeCsv(order.userEmail || ""),
                order.status,
                order.paymentStatus,
                order.total,
                order.itemCount
            ];
            csvRows.push(row.join(","));
        }

        return csvRows.join("\n");
    }

    private escapeCsv(str: string | number): string {
        if (str === null || str === undefined) return "";
        const stringValue = String(str);
        if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    }
}

export const importExportService = new ImportExportService();
