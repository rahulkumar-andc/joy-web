/**
 * Edge Cache Utilities
 * 
 * Utilities for managing edge/CDN cache invalidation
 * Works with Cloudflare, Vercel, Fastly, AWS CloudFront, etc.
 */

import { logger } from "../../logger";

// ============================================================================
// Types
// ============================================================================

interface CachePurgeResult {
    success: boolean;
    provider?: string;
    message?: string;
    error?: string;
}

// ============================================================================
// Cloudflare Cache Purge
// ============================================================================

async function purgeCloudflare(tags: string[]): Promise<CachePurgeResult> {
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!zoneId || !apiToken) {
        return { success: false, error: "Cloudflare credentials not configured" };
    }

    try {
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ tags }),
            }
        );

        const data = await response.json() as { success: boolean; errors?: unknown[] };

        if (data.success) {
            logger.info({ message: "Cloudflare cache purged", tags });
            return { success: true, provider: "Cloudflare", message: "Cache purged" };
        } else {
            logger.error({ message: "Cloudflare purge failed", errors: data.errors });
            return { success: false, provider: "Cloudflare", error: JSON.stringify(data.errors) };
        }
    } catch (error) {
        logger.error({ message: "Cloudflare purge error", error });
        return { success: false, provider: "Cloudflare", error: String(error) };
    }
}

// ============================================================================
// Vercel Cache Purge (via revalidation)
// ============================================================================

async function purgeVercel(paths: string[]): Promise<CachePurgeResult> {
    const deployUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
    const revalidateToken = process.env.REVALIDATE_TOKEN;

    if (!deployUrl) {
        return { success: false, error: "Vercel URL not configured" };
    }

    try {
        const results = await Promise.all(
            paths.map(async (path) => {
                const url = `https://${deployUrl}/api/revalidate?path=${encodeURIComponent(path)}${revalidateToken ? `&secret=${revalidateToken}` : ""
                    }`;
                const res = await fetch(url);
                return res.ok;
            })
        );

        const allSuccess = results.every(Boolean);

        if (allSuccess) {
            logger.info({ message: "Vercel cache revalidated", paths });
            return { success: true, provider: "Vercel", message: "Cache revalidated" };
        } else {
            return { success: false, provider: "Vercel", error: "Some paths failed to revalidate" };
        }
    } catch (error) {
        logger.error({ message: "Vercel revalidation error", error });
        return { success: false, provider: "Vercel", error: String(error) };
    }
}

// ============================================================================
// Fastly Cache Purge
// ============================================================================

async function purgeFastly(surrogateKeys: string[]): Promise<CachePurgeResult> {
    const serviceId = process.env.FASTLY_SERVICE_ID;
    const apiKey = process.env.FASTLY_API_KEY;

    if (!serviceId || !apiKey) {
        return { success: false, error: "Fastly credentials not configured" };
    }

    try {
        const response = await fetch(
            `https://api.fastly.com/service/${serviceId}/purge`,
            {
                method: "POST",
                headers: {
                    "Fastly-Key": apiKey,
                    "Surrogate-Key": surrogateKeys.join(" "),
                },
            }
        );

        if (response.ok) {
            logger.info({ message: "Fastly cache purged", surrogateKeys });
            return { success: true, provider: "Fastly", message: "Cache purged" };
        } else {
            const error = await response.text();
            logger.error({ message: "Fastly purge failed", error });
            return { success: false, provider: "Fastly", error };
        }
    } catch (error) {
        logger.error({ message: "Fastly purge error", error });
        return { success: false, provider: "Fastly", error: String(error) };
    }
}

// ============================================================================
// Main Cache Purge Function
// ============================================================================

/**
 * Purge hero campaign cache from all configured CDNs
 */
export async function purgeHeroCache(): Promise<CachePurgeResult[]> {
    const results: CachePurgeResult[] = [];
    const cacheTag = "hero-campaigns";
    const paths = ["/api/hero", "/api/hero/carousel"];

    // Try all configured providers
    if (process.env.CLOUDFLARE_ZONE_ID) {
        results.push(await purgeCloudflare([cacheTag]));
    }

    if (process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL) {
        results.push(await purgeVercel(paths));
    }

    if (process.env.FASTLY_SERVICE_ID) {
        results.push(await purgeFastly([cacheTag]));
    }

    // If no providers configured, just log
    if (results.length === 0) {
        logger.info({ message: "No CDN configured, in-memory cache invalidated only" });
        results.push({ success: true, message: "In-memory cache invalidated" });
    }

    return results;
}

/**
 * Cache configuration for documentation
 */
export const CACHE_DOCS = {
    ttl: 60, // seconds
    staleWhileRevalidate: 300, // seconds
    headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "Surrogate-Control": "max-age=60",
        "Cache-Tag": "hero-campaigns",
    },
    providers: {
        cloudflare: {
            envVars: ["CLOUDFLARE_ZONE_ID", "CLOUDFLARE_API_TOKEN"],
            docs: "https://developers.cloudflare.com/cache/how-to/purge-cache/",
        },
        vercel: {
            envVars: ["VERCEL_URL", "REVALIDATE_TOKEN"],
            docs: "https://vercel.com/docs/concepts/next.js/incremental-static-regeneration",
        },
        fastly: {
            envVars: ["FASTLY_SERVICE_ID", "FASTLY_API_KEY"],
            docs: "https://docs.fastly.com/en/guides/purging",
        },
    },
};
