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
     * Import products from CSV buffer
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

                try {
                    // Validate required fields
                    if (!row.Name || !row.Price || !row.Description) {
                        throw new Error("Missing required fields (Name, Price, Description)");
                    }

                    // Handle Category
                    let categoryId = null;
                    if (row.Category) {
                        const catLower = row.Category.trim().toLowerCase();
                        if (categoryMap.has(catLower)) {
                            categoryId = categoryMap.get(catLower)!;
                        } else {
                            // Create new category on the fly
                            const slug = row.Category.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            const newCat = await productRepository.createCategory({
                                name: row.Category.trim(),
                                slug: slug,
                                description: `Imported category`,
                                imageUrl: null
                            } as InsertCategory);
                            categoryId = newCat.id;
                            categoryMap.set(catLower, categoryId);
                            logger.info(`Created new category during import: ${row.Category}`);
                        }
                    }

                    // Parse Arrays (pipe separated)
                    const images = row.Images ? row.Images.split('|').map((s: string) => s.trim()) : [];
                    if (images.length === 0) {
                        // Default placeholder if no image
                        images.push("https://placehold.co/600x400?text=No+Image");
                    }

                    const sizes = row.Sizes ? row.Sizes.split('|').map((s: string) => s.trim()) : [];
                    const colors = row.Colors ? row.Colors.split('|').map((s: string) => s.trim()) : [];
                    const tags = row.Tags ? row.Tags.split('|').map((s: string) => s.trim()) : [];

                    const product: InsertProduct = {
                        name: row.Name,
                        description: row.Description,
                        price: row.Price, // string/decimal is fine
                        stockQuantity: row.Stock ? parseInt(row.Stock, 10) : 0,
                        categoryId: categoryId,
                        brand: row.Brand || null,
                        images: images,
                        sizes: sizes.length ? sizes : null,
                        colors: colors.length ? colors : null,
                        tags: tags.length ? tags : null,
                        discountPrice: row.DiscountPrice || null,
                        isFeatured: row.IsFeatured === 'true',
                        showOnHomepage: true // Default to true
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
                p.price,
                p.discountPrice || "",
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
