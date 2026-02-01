/**
 * Image Migration Script
 * 
 * Migrates existing product images from local storage to ImageKit
 */

import { db } from '../db';
import { products } from '@shared/schema';
import { imagekitService } from '../services/imagekitService';
import { logger } from '../logger';
import { eq } from 'drizzle-orm';

interface MigrationResult {
    productId: number;
    oldUrls: string[];
    newUrls: string[];
    success: boolean;
    error?: string;
}

export class ImageMigrationService {
    /**
     * Migrate all product images to ImageKit
     */
    async migrateAllProducts(): Promise<{
        total: number;
        successful: number;
        failed: number;
        results: MigrationResult[];
    }> {
        logger.info('Starting image migration to ImageKit...');

        // Get all products with images
        const allProducts = await db.select().from(products);
        const results: MigrationResult[] = [];

        let successful = 0;
        let failed = 0;

        for (const product of allProducts) {
            try {
                const result = await this.migrateProductImages(product.id, product.images);
                results.push(result);

                if (result.success) {
                    successful++;
                } else {
                    failed++;
                }

                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                logger.error(`Failed to migrate product ${product.id}`, error);
                results.push({
                    productId: product.id,
                    oldUrls: product.images,
                    newUrls: [],
                    success: false,
                    error: String(error)
                });
                failed++;
            }
        }

        logger.info('Migration complete', { total: allProducts.length, successful, failed });

        return {
            total: allProducts.length,
            successful,
            failed,
            results
        };
    }

    /**
     * Migrate images for a single product
     */
    async migrateProductImages(
        productId: number,
        imageUrls: string[]
    ): Promise<MigrationResult> {
        const newUrls: string[] = [];

        try {
            for (let i = 0; i < imageUrls.length; i++) {
                const oldUrl = imageUrls[i];

                // Skip if already on ImageKit
                if (oldUrl.includes('imagekit.io')) {
                    newUrls.push(oldUrl);
                    continue;
                }

                // Upload to ImageKit
                const fileName = `product-${productId}-${i + 1}.jpg`;
                const result = await imagekitService.uploadFromUrl(
                    oldUrl,
                    fileName,
                    '/products'
                );

                newUrls.push(result.url);
            }

            // Update product with new URLs
            await db
                .update(products)
                .set({ images: newUrls })
                .where(eq(products.id, productId));

            logger.info(`Migrated product ${productId}`, {
                oldCount: imageUrls.length,
                newCount: newUrls.length
            });

            return {
                productId,
                oldUrls: imageUrls,
                newUrls,
                success: true
            };
        } catch (error) {
            logger.error(`Failed to migrate product ${productId}`, error);
            return {
                productId,
                oldUrls: imageUrls,
                newUrls,
                success: false,
                error: String(error)
            };
        }
    }

    /**
     * Rollback migration for a product (restore old URLs)
     */
    async rollbackProduct(productId: number, oldUrls: string[]): Promise<void> {
        await db
            .update(products)
            .set({ images: oldUrls })
            .where(eq(products.id, productId));

        logger.info(`Rolled back product ${productId} images`);
    }

    /**
     * Get migration status
     */
    async getMigrationStatus(): Promise<{
        totalProducts: number;
        migratedProducts: number;
        unmigrated: number;
    }> {
        const allProducts = await db.select().from(products);

        let migratedProducts = 0;
        let unmigrated = 0;

        for (const product of allProducts) {
            const hasMigratedImages = product.images.some(url => url.includes('imagekit.io'));

            if (hasMigratedImages) {
                migratedProducts++;
            } else {
                unmigrated++;
            }
        }

        return {
            totalProducts: allProducts.length,
            migratedProducts,
            unmigrated
        };
    }
}

export const imageMigrationService = new ImageMigrationService();
