import { db } from "../db";
import { products, categories, productSizes, productColors, productImages, type Product, type InsertProduct, type Category, type InsertCategory, type InsertProductSize, type InsertProductColor, type InsertProductImage } from "@shared/schema";
import { eq, ilike, desc, sql, and, inArray } from "drizzle-orm";
import { logger } from "../logger";

// Extended product type with category info
export interface ProductWithCategory extends Product {
    category?: Category | null;
}

export class ProductRepository {
    async findById(id: number): Promise<Product | undefined> {
        // Strictly filter by moderationStatus for public access
        const [product] = await db.select()
            .from(products)
            .where(and(
                eq(products.id, id),
                eq(products.moderationStatus, 'approved')
            ));
        return product;
    }

    /**
     * Find product by ID with category data (single query with JOIN)
     */
    async findByIdWithCategory(id: number): Promise<ProductWithCategory | undefined> {
        const startTime = Date.now();

        const result = await db
            .select({
                product: products,
                category: categories,
            })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(and(
                eq(products.id, id),
                eq(products.moderationStatus, 'approved')
            ));

        const duration = Date.now() - startTime;
        if (duration > 100) {
            logger.warn(`Slow query: findByIdWithCategory took ${duration}ms`);
        }

        if (result.length === 0) return undefined;

        return {
            ...result[0].product,
            category: result[0].category,
        };
    }

    async findAll(filters?: { category?: string; search?: string; sort?: string; page?: number; limit?: number }): Promise<{ products: Product[]; total: number }> {
        const startTime = Date.now();
        const conditions = [];

        // Strictly enforce filtering by APPROVED products for public API
        conditions.push(eq(products.moderationStatus, "approved"));

        // Optimized: Use subquery for category instead of separate query
        if (filters?.category) {
            conditions.push(
                sql`${products.categoryId} IN (
                    SELECT id FROM ${categories} WHERE slug = ${filters.category}
                )`
            );
        }

        if (filters?.search) {
            conditions.push(
                sql`(${ilike(products.name, `%${filters.search}%`)} OR ${ilike(products.description, `%${filters.search}%`)})`
            );
        }

        let whereClause = undefined;
        if (conditions.length > 0) {
            if (conditions.length === 1) {
                whereClause = conditions[0];
            } else {
                whereClause = and(...conditions);
            }
        }

        const [countResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        let query = db.select().from(products).where(whereClause);

        if (filters?.sort === 'price_asc') {
            query.orderBy(sql`CAST(${products.mrp} AS DECIMAL) ASC`);
        } else if (filters?.sort === 'price_desc') {
            query.orderBy(sql`CAST(${products.mrp} AS DECIMAL) DESC`);
        } else {
            query.orderBy(desc(products.createdAt));
        }

        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        query.limit(limit).offset(offset);

        const results = await query;

        const duration = Date.now() - startTime;
        if (duration > 100) {
            logger.warn(`Slow query: findAll took ${duration}ms`, { filters });
        }

        return { products: results, total };
    }

    /**
     * Find all products with category data in a single query (N+1 prevention)
     */
    async findAllWithCategories(filters?: { category?: string; search?: string; sort?: string; page?: number; limit?: number }): Promise<{ products: ProductWithCategory[]; total: number }> {
        const startTime = Date.now();
        const conditions = [];

        // Strictly enforce filtering by APPROVED products for public API
        conditions.push(eq(products.moderationStatus, "approved"));

        if (filters?.category) {
            conditions.push(eq(categories.slug, filters.category));
        }

        if (filters?.search) {
            conditions.push(
                sql`(${ilike(products.name, `%${filters.search}%`)} OR ${ilike(products.description, `%${filters.search}%`)})`
            );
        }

        let whereClause = undefined;
        if (conditions.length > 0) {
            if (conditions.length === 1) {
                whereClause = conditions[0];
            } else {
                whereClause = and(...conditions);
            }
        }

        // Single query with JOIN for count
        const [countResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(whereClause);
        const total = Number(countResult?.count || 0);

        // Build main query with JOIN
        let baseQuery = db
            .select({
                product: products,
                category: categories,
            })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(whereClause);

        // Apply sorting
        if (filters?.sort === 'price_asc') {
            baseQuery = baseQuery.orderBy(sql`CAST(${products.mrp} AS DECIMAL) ASC`) as typeof baseQuery;
        } else if (filters?.sort === 'price_desc') {
            baseQuery = baseQuery.orderBy(sql`CAST(${products.mrp} AS DECIMAL) DESC`) as typeof baseQuery;
        } else {
            baseQuery = baseQuery.orderBy(desc(products.createdAt)) as typeof baseQuery;
        }

        // Apply pagination
        const page = filters?.page || 1;
        const limit = filters?.limit || 50;
        const offset = (page - 1) * limit;

        const results = await baseQuery.limit(limit).offset(offset);

        const duration = Date.now() - startTime;
        if (duration > 100) {
            logger.warn(`Slow query: findAllWithCategories took ${duration}ms`, { filters });
        }

        // Transform results
        const productsWithCategory: ProductWithCategory[] = results.map(row => ({
            ...row.product,
            category: row.category,
        }));

        return { products: productsWithCategory, total };
    }

    async create(productData: InsertProduct & {
        variantSizes?: Omit<InsertProductSize, "productId">[],
        variantColors?: Omit<InsertProductColor, "productId">[],
        galleryImages?: Omit<InsertProductImage, "productId">[]
    }): Promise<Product> {
        return await db.transaction(async (tx) => {
            const { variantSizes, variantColors, galleryImages, ...productFields } = productData;

            // Backward compatibility: Populate legacy arrays if new variants are provided
            if (variantSizes && variantSizes.length > 0 && !productFields.sizes) {
                productFields.sizes = variantSizes.map(s => s.size);
            }
            if (variantColors && variantColors.length > 0 && !productFields.colors) {
                productFields.colors = variantColors.map(c => c.colorName);
            }
            // Populate main image from gallery if not provided
            if (galleryImages && galleryImages.length > 0 && (!productFields.images || productFields.images.length === 0)) {
                productFields.images = galleryImages.map(g => g.imageUrl);
            }

            // 1. Insert Product
            const [newProduct] = await tx.insert(products).values(productFields).returning();

            // 2. Insert Sizes
            if (variantSizes && variantSizes.length > 0) {
                await tx.insert(productSizes).values(
                    variantSizes.map(s => ({ ...s, productId: newProduct.id }))
                );
            }

            // 3. Insert Colors
            if (variantColors && variantColors.length > 0) {
                await tx.insert(productColors).values(
                    variantColors.map(c => ({ ...c, productId: newProduct.id }))
                );
            }

            // 4. Insert Images (Gallery)
            if (galleryImages && galleryImages.length > 0) {
                await tx.insert(productImages).values(
                    galleryImages.map(img => ({ ...img, productId: newProduct.id }))
                );
            }

            return newProduct;
        });
    }

    async bulkCreate(productsData: InsertProduct[]): Promise<Product[]> {
        if (productsData.length === 0) return [];
        const newProducts = await db.insert(products).values(productsData).returning();
        return newProducts;
    }

    async update(id: number, updates: Partial<InsertProduct>): Promise<Product | undefined> {
        const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
        return updated;
    }

    async delete(id: number): Promise<void> {
        await db.delete(products).where(eq(products.id, id));
    }

    // Categories
    async getCategories(): Promise<Category[]> {
        return await db.select().from(categories);
    }

    async createCategory(category: InsertCategory): Promise<Category> {
        const [newCategory] = await db.insert(categories).values(category).returning();
        return newCategory;
    }
}

export const productRepository = new ProductRepository();
