/**
 * ImageKit Cloud Storage Service
 * 
 * Handles image uploads, optimization, and management via ImageKit.
 */

import ImageKit from 'imagekit';
import { logger } from '../logger';

// Initialize ImageKit
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!
});

interface UploadOptions {
    file: Buffer | string; // File buffer or base64 string
    fileName: string;
    folder?: string;
    useUniqueFileName?: boolean;
    tags?: string[];
}

interface UploadResult {
    url: string;
    fileId: string;
    thumbnailUrl: string;
    name: string;
}

export class ImageKitService {
    /**
     * Upload image to ImageKit with automatic optimization
     */
    async uploadImage(options: UploadOptions): Promise<UploadResult> {
        try {
            const result = await imagekit.upload({
                file: options.file,
                fileName: options.fileName,
                folder: options.folder || '/products',
                useUniqueFileName: options.useUniqueFileName !== false,
                tags: options.tags || [],
                transformation: {
                    pre: 'f-auto,q-80', // Auto format (WebP when supported), quality 80%
                }
            });

            logger.info('Image uploaded to ImageKit', {
                fileId: result.fileId,
                url: result.url,
                name: result.name
            });

            return {
                url: result.url,
                fileId: result.fileId,
                thumbnailUrl: result.thumbnailUrl,
                name: result.name
            };
        } catch (error) {
            logger.error('ImageKit upload failed', error);
            throw new Error(`Failed to upload image: ${error}`);
        }
    }

    /**
     * Upload image from URL
     */
    async uploadFromUrl(imageUrl: string, fileName: string, folder?: string): Promise<UploadResult> {
        try {
            // Fetch image from URL
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image from ${imageUrl}`);
            }

            const buffer = Buffer.from(await response.arrayBuffer());

            return await this.uploadImage({
                file: buffer,
                fileName,
                folder,
                tags: ['migrated']
            });
        } catch (error) {
            logger.error('Failed to upload from URL', { imageUrl, error });
            throw error;
        }
    }

    /**
     * Get optimized image URL with transformations
     */
    getOptimizedUrl(
        url: string,
        options?: {
            width?: number;
            height?: number;
            format?: 'webp' | 'jpg' | 'png';
            quality?: number;
        }
    ): string {
        const transformations: string[] = [];

        if (options?.width) transformations.push(`w-${options.width}`);
        if (options?.height) transformations.push(`h-${options.height}`);
        if (options?.format) transformations.push(`f-${options.format}`);
        if (options?.quality) transformations.push(`q-${options.quality}`);

        if (transformations.length === 0) {
            transformations.push('f-auto', 'q-80');
        }

        return `${url}?tr=${transformations.join(',')}`;
    }

    /**
     * Delete image from ImageKit
     */
    async deleteImage(fileId: string): Promise<void> {
        try {
            await imagekit.deleteFile(fileId);
            logger.info('Image deleted from ImageKit', { fileId });
        } catch (error) {
            logger.error('Failed to delete image', { fileId, error });
            throw error;
        }
    }

    /**
     * List files in a folder
     */
    async listFiles(folder: string = '/products') {
        try {
            const result = await imagekit.listFiles({
                path: folder,
                limit: 1000
            });
            return result;
        } catch (error) {
            logger.error('Failed to list files', { folder, error });
            throw error;
        }
    }

    /**
     * Generate thumbnail URL
     */
    getThumbnail(url: string, size: number = 200): string {
        return this.getOptimizedUrl(url, {
            width: size,
            height: size,
            quality: 70
        });
    }

    /**
     * Bulk upload images
     */
    async bulkUpload(images: { url: string; fileName: string }[]): Promise<UploadResult[]> {
        const results: UploadResult[] = [];

        for (const image of images) {
            try {
                const result = await this.uploadFromUrl(
                    image.url,
                    image.fileName,
                    '/products'
                );
                results.push(result);
            } catch (error) {
                logger.error('Bulk upload failed for image', { url: image.url, error });
                // Continue with next image
            }
        }

        return results;
    }
}

export const imagekitService = new ImageKitService();
