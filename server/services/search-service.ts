import { MeiliSearch, Index, SearchParams, SearchResponse } from "meilisearch";
import { logger } from "../logger";
import { Product, products, categories } from "@shared/schema";
import { createCircuitBreaker, CIRCUIT_OPTIONS } from "../config/circuit-breakers";
import CircuitBreaker from "opossum";
import { db } from "../db";
import { ilike, or, eq, desc, and, sql } from "drizzle-orm";

// ============================================================================
// MEILISEARCH CLIENT CONFIGURATION
// ============================================================================

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || "http://localhost:7700";
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || "";

let meiliClient: MeiliSearch | null = null;

/**
 * Get MeiliSearch client instance
 */
function getClient(): MeiliSearch {
    if (!meiliClient) {
        meiliClient = new MeiliSearch({
            host: MEILISEARCH_HOST,
            apiKey: MEILISEARCH_API_KEY,
        });
        logger.info(`🔍 MeiliSearch client initialized: ${MEILISEARCH_HOST}`);
    }
    return meiliClient;
}

// ============================================================================
// INDEX CONFIGURATION
// ============================================================================

const PRODUCT_INDEX_NAME = "products";

// Searchable attributes (in order of importance)
const SEARCHABLE_ATTRIBUTES = [
    "name",
    "description",
    "brand",
    "tags",
    "category",
];

// Filterable attributes (for faceted search)
const FILTERABLE_ATTRIBUTES = [
    "categoryId",
    "category",
    "brand",
    "price",
    "salePrice",
    "isFeatured",
    "isTrending",
    "isBestSeller",
    "isNewArrival",
    "stockQuantity",
];

// Sortable attributes
const SORTABLE_ATTRIBUTES = [
    "price",
    "createdAt",
    "name",
];

// ============================================================================
// DOCUMENT TYPE FOR INDEXING
// ============================================================================

export interface ProductDocument {
    id: number;
    name: string;
    description: string;
    price: number;
    salePrice: number | null;
    categoryId: number | null;
    category: string | null;
    brand: string | null;
    tags: string[];
    images: string[];
    stockQuantity: number;
    isFeatured: boolean;
    isTrending: boolean;
    isBestSeller: boolean;
    isNewArrival: boolean;
    createdAt: number; // Unix timestamp for sorting
    _fallback?: boolean;
}

/**
 * Convert database product to search document
 */
function toSearchDocument(product: Product, categoryName?: string): ProductDocument {
    return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: parseFloat(product.mrp),
        salePrice: product.salePrice ? parseFloat(product.salePrice) : null,
        categoryId: product.categoryId,
        category: categoryName || null,
        brand: product.brand,
        tags: product.tags || [],
        images: product.images,
        stockQuantity: product.stockQuantity,
        isFeatured: product.isFeatured || false,
        isTrending: product.isTrending || false,
        isBestSeller: product.isBestSeller || false,
        isNewArrival: product.isNewArrival || false,
        createdAt: product.createdAt ? new Date(product.createdAt).getTime() : Date.now(),
    };
}

// ============================================================================
// SEARCH SERVICE
// ============================================================================

interface SearchOptions {
    page?: number;
    limit?: number;
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: "price_asc" | "price_desc" | "newest" | "name";
    onlyInStock?: boolean;
}

export const searchService = {
    searchBreaker: undefined as any | undefined, // CircuitBreaker type is complex with args, simplifying to any to allow assignment

    init() {
        if (!this.searchBreaker) {
            this.searchBreaker = createCircuitBreaker(
                this.searchRaw.bind(this),
                CIRCUIT_OPTIONS.SEARCH,
                this.searchFallback.bind(this)
            );
        }
    },

    /**
     * Initialize the products index with proper settings
     */
    async initializeIndex(): Promise<void> {
        this.init(); // Ensure breaker is init
        const client = getClient();

        try {
            // Create or get index
            const index = client.index(PRODUCT_INDEX_NAME);

            // Configure index settings
            await index.updateSettings({
                searchableAttributes: SEARCHABLE_ATTRIBUTES,
                filterableAttributes: FILTERABLE_ATTRIBUTES,
                sortableAttributes: SORTABLE_ATTRIBUTES,
                rankingRules: [
                    "words",
                    "typo",
                    "proximity",
                    "attribute",
                    "sort",
                    "exactness",
                ],
                // Typo tolerance
                typoTolerance: {
                    enabled: true,
                    minWordSizeForTypos: {
                        oneTypo: 4,
                        twoTypos: 8,
                    },
                },
            });

            logger.info("🔍 MeiliSearch products index initialized");
        } catch (error) {
            logger.error("Failed to initialize MeiliSearch index:", error);
            throw error;
        }
    },

    /**
     * Index a single product
     */
    async indexProduct(product: Product, categoryName?: string): Promise<void> {
        const client = getClient();
        const index = client.index(PRODUCT_INDEX_NAME);

        try {
            const document = toSearchDocument(product, categoryName);
            await index.addDocuments([document]);
            logger.debug(`Indexed product: ${product.id}`);
        } catch (error) {
            logger.error(`Failed to index product ${product.id}:`, error);
            throw error;
        }
    },

    /**
     * Index multiple products (bulk operation)
     */
    async indexProducts(products: Array<Product & { categoryName?: string }>): Promise<void> {
        const client = getClient();
        const index = client.index(PRODUCT_INDEX_NAME);

        try {
            const documents = products.map(p => toSearchDocument(p, p.categoryName));
            await index.addDocuments(documents);
            logger.info(`Indexed ${products.length} products`);
        } catch (error) {
            logger.error("Failed to bulk index products:", error);
            throw error;
        }
    },

    /**
     * Remove a product from the index
     */
    async removeProduct(productId: number): Promise<void> {
        const client = getClient();
        const index = client.index(PRODUCT_INDEX_NAME);

        try {
            await index.deleteDocument(productId);
            logger.debug(`Removed product from index: ${productId}`);
        } catch (error) {
            logger.error(`Failed to remove product ${productId} from index:`, error);
            throw error;
        }
    },

    /**
     * Raw search function
     */
    async searchRaw(query: string, options?: SearchOptions) {
        const client = getClient();
        const index = client.index(PRODUCT_INDEX_NAME);

        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const offset = (page - 1) * limit;

        // Build filters
        const filters: string[] = [];

        if (options?.category) {
            filters.push(`category = "${options.category}"`);
        }

        if (options?.brand) {
            filters.push(`brand = "${options.brand}"`);
        }

        if (options?.minPrice !== undefined) {
            filters.push(`price >= ${options.minPrice}`);
        }

        if (options?.maxPrice !== undefined) {
            filters.push(`price <= ${options.maxPrice}`);
        }

        if (options?.onlyInStock) {
            filters.push(`stockQuantity > 0`);
        }

        // Build sort
        let sort: string[] | undefined;
        switch (options?.sort) {
            case "price_asc":
                sort = ["price:asc"];
                break;
            case "price_desc":
                sort = ["price:desc"];
                break;
            case "newest":
                sort = ["createdAt:desc"];
                break;
            case "name":
                sort = ["name:asc"];
                break;
        }

        const searchParams: SearchParams = {
            offset,
            limit,
            filter: filters.length > 0 ? filters.join(" AND ") : undefined,
            sort,
        };

        const result = await index.search<ProductDocument>(query, searchParams);

        return {
            products: result.hits,
            total: result.estimatedTotalHits || 0,
            query,
            processingTimeMs: result.processingTimeMs,
        }
    },

    /**
     * Fallback search function (PostgreSQL)
     */
    async searchFallback(query: string, options?: SearchOptions) {
        logger.warn('MeiliSearch circuit open - using PostgreSQL fallback', { query });

        const limit = options?.limit || 20;
        const page = options?.page || 1;
        const offset = (page - 1) * limit;

        // Basic ILIKE search on normalized columns
        const whereConditions = [
            or(
                ilike(products.name, `%${query}%`),
                ilike(products.description, `%${query}%`),
                ilike(products.brand, `%${query}%`)
            )
        ];

        // Apply basic filters if possible (simplified for fallback)
        if (options?.minPrice) {
            whereConditions.push(sql`${products.mrp} >= ${options.minPrice}`);
        }

        const results = await db
            .select({
                product: products,
                categoryName: categories.name,
            })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(and(...whereConditions))
            .limit(limit)
            .offset(offset)
            .orderBy(desc(products.createdAt)); // Default to newest for fallback

        // Transform result
        const productDocs = results.map(row => ({
            ...toSearchDocument(row.product, row.categoryName || undefined),
            _fallback: true
        }));

        return {
            products: productDocs,
            total: productDocs.length, // Approximate/Limited
            query,
            processingTimeMs: 0,
            _fallback: true
        };
    },

    /**
     * Search products (wrapped with circuit breaker)
     */
    async search(
        query: string,
        options?: SearchOptions
    ): Promise<{
        products: ProductDocument[];
        total: number;
        query: string;
        processingTimeMs: number;
        _fallback?: boolean;
    }> {
        this.init(); // Ensure initialized
        try {
            return await this.searchBreaker!.fire(query, options);
        } catch (error) {
            logger.error("Search failed completely (circuit breaker & fallback):", error);
            // Last resort empty fallback
            return { products: [], total: 0, query, processingTimeMs: 0, _fallback: true };
        }
    },

    /**
     * Get autocomplete suggestions
     */
    async autocomplete(
        query: string,
        limit: number = 5
    ): Promise<{
        suggestions: Array<{ id: number; name: string; category: string | null }>;
    }> {
        const client = getClient();
        const index = client.index(PRODUCT_INDEX_NAME);

        try {
            const result = await index.search<ProductDocument>(query, {
                limit,
                attributesToRetrieve: ["id", "name", "category"],
            });

            return {
                suggestions: result.hits.map(hit => ({
                    id: hit.id,
                    name: hit.name,
                    category: hit.category,
                })),
            };
        } catch (error) {
            logger.error("Autocomplete failed:", error);
            return { suggestions: [] };
        }
    },

    /**
     * Get available filter options (facets)
     */
    async getFilterOptions(): Promise<{
        categories: string[];
        brands: string[];
        priceRange: { min: number; max: number };
    }> {
        const client = getClient();
        const index = client.index(PRODUCT_INDEX_NAME);

        try {
            // Use faceted search to get unique values
            const result = await index.search("", {
                limit: 0,
                facets: ["category", "brand"],
            });

            const categories = Object.keys(result.facetDistribution?.category || {});
            const brands = Object.keys(result.facetDistribution?.brand || {});

            // Get price range (simplified - in production, use stats endpoint)
            const priceRange = { min: 0, max: 100000 };

            return { categories, brands, priceRange };
        } catch (error) {
            logger.error("Failed to get filter options:", error);
            return { categories: [], brands: [], priceRange: { min: 0, max: 100000 } };
        }
    },

    /**
     * Check if MeiliSearch is healthy
     */
    async isHealthy(): Promise<boolean> {
        try {
            const client = getClient();
            await client.health();
            return true;
        } catch (error) {
            logger.error("MeiliSearch health check failed:", error);
            return false;
        }
    },

    /**
     * Get index stats
     */
    async getStats(): Promise<{
        numberOfDocuments: number;
        isIndexing: boolean;
    } | null> {
        try {
            const client = getClient();
            const index = client.index(PRODUCT_INDEX_NAME);
            const stats = await index.getStats();

            return {
                numberOfDocuments: stats.numberOfDocuments,
                isIndexing: stats.isIndexing,
            };
        } catch (error) {
            logger.error("Failed to get index stats:", error);
            return null;
        }
    },

    // Check breaker status
    getBreakerStats() {
        if (!this.searchBreaker) return null;
        return {
            opened: this.searchBreaker.opened,
            stats: this.searchBreaker.stats
        };
    }
};

// ============================================================================
// SYNC FUNCTIONS
// ============================================================================

/**
 * Full sync: Index all products from database
 */
export async function syncAllProducts(): Promise<{ indexed: number; errors: number }> {
    logger.info("🔍 Starting full product sync to search index...");
    const startTime = Date.now();

    try {
        // Import repository dynamically to avoid circular dependencies if needed, 
        // but here we can just use imported db since we're in service layer.

        // Fetch all products with category names
        const allProducts = await db
            .select({
                product: products,
                categoryName: categories.name,
            })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id));

        // Transform and index
        const productsWithCategory = allProducts.map(row => ({
            ...row.product,
            categoryName: row.categoryName || undefined,
        }));

        await searchService.indexProducts(productsWithCategory);

        const duration = Date.now() - startTime;
        logger.info(`🔍 Full sync completed: ${productsWithCategory.length} products in ${duration}ms`);

        return { indexed: productsWithCategory.length, errors: 0 };
    } catch (error) {
        logger.error("Full sync failed:", error);
        return { indexed: 0, errors: 1 };
    }
}
