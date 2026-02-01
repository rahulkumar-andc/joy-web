import { db } from "../db";
import { products, categories, type Product, type InsertProduct, type Category, type InsertCategory } from "@shared/schema";
import { eq, ilike, desc, sql, and, inArray } from "drizzle-orm";
import { logger } from "../logger";

// Extended product type with category info
export interface ProductWithCategory extends Product {
    category?: Category | null;
}

export class ProductRepository {
    async findById(id: number): Promise<Product | undefined> {
        const [product] = await db.select().from(products).where(eq(products.id, id));
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
            .where(eq(products.id, id));

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
            query.orderBy(sql`CAST(${products.price} AS DECIMAL) ASC`);
        } else if (filters?.sort === 'price_desc') {
            query.orderBy(sql`CAST(${products.price} AS DECIMAL) DESC`);
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
            baseQuery = baseQuery.orderBy(sql`CAST(${products.price} AS DECIMAL) ASC`) as typeof baseQuery;
        } else if (filters?.sort === 'price_desc') {
            baseQuery = baseQuery.orderBy(sql`CAST(${products.price} AS DECIMAL) DESC`) as typeof baseQuery;
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

    async create(product: InsertProduct): Promise<Product> {
        const [newProduct] = await db.insert(products).values(product).returning();
        return newProduct;
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
