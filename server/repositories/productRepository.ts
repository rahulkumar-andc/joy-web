import { db } from "../db";
import { products, categories, type Product, type InsertProduct, type Category, type InsertCategory } from "@shared/schema";
import { eq, ilike, desc, sql, and } from "drizzle-orm";

export class ProductRepository {
    async findById(id: number): Promise<Product | undefined> {
        const [product] = await db.select().from(products).where(eq(products.id, id));
        return product;
    }

    async findAll(filters?: { category?: string; search?: string; sort?: string; page?: number; limit?: number }): Promise<{ products: Product[]; total: number }> {
        const conditions = [];

        if (filters?.category) {
            const [cat] = await db.select().from(categories).where(eq(categories.slug, filters.category));
            if (cat) {
                conditions.push(eq(products.categoryId, cat.id));
            }
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
        return { products: results, total };
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
