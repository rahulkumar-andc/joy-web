import { useQuery, UseQueryOptions } from "@tanstack/react-query";

/**
 * Campaign content configuration
 */
export interface CampaignContent {
    title: string;
    subtitle: string | null;
    cta: {
        label: string | null;
        href: string | null;
    };
    secondaryCta?: {
        label: string | null;
        href: string | null;
    };
    endTime?: string | null;
}

/**
 * Campaign media configuration
 */
export interface CampaignMedia {
    type: "image" | "video";
    url: string;
}

/**
 * Campaign UI configuration
 */
export interface CampaignUI {
    alignment: "left" | "center" | "right";
    // Support both casings for backward compatibility during migration
    overlay_opacity?: number;
    overlayOpacity?: number;
    text_color?: string;
    textColor?: string;
    id: number;
    // Positioning (Offsets)
    titleOffsetX?: number;
    titleOffsetY?: number;
    subtitleOffsetX?: number;
    subtitleOffsetY?: number;
    ctaOffsetX?: number;
    ctaOffsetY?: number;
    countdownOffsetX?: number;
    countdownOffsetY?: number;
    // New Styling
    titleFontSize?: number | null;
    subtitleFontSize?: number | null;
    fontWeight?: "normal" | "bold";
    overlayColor?: "black" | "gradient" | "brand";
    deviceTarget?: "all" | "desktop" | "mobile";
    enableAnalytics?: boolean;
}

/**
 * Hero configuration response from API
 */
export interface HeroConfig {
    media: CampaignMedia;
    content: CampaignContent;
    ui: CampaignUI;
}

/**
 * Fallback configuration when no campaign is active
 */
export const DEFAULT_HERO_CONFIG: HeroConfig = {
    media: {
        type: "image",
        url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=3870&auto=format&fit=crop",
    },
    content: {
        title: "Elevate Your Style",
        subtitle: "Discover the new collection defined by elegance and comfort.",
        cta: {
            label: "Shop Collection",
            href: "/shop",
        },
    },
    ui: {
        alignment: "left",
        overlay_opacity: 0.4,
        text_color: "#ffffff",
        id: 0,
        titleOffsetX: 0,
        titleOffsetY: 0,
        subtitleOffsetX: 0,
        subtitleOffsetY: 50,
        ctaOffsetX: 0,
        ctaOffsetY: 100,
        countdownOffsetX: 0,
        countdownOffsetY: -100,
    },
};

/**
 * Query key factory for hero-related queries
 */
export const heroQueryKeys = {
    all: ["/api/hero"] as const,
} as const;

/**
 * Fetch hero configuration from API
 * Uses fetch directly to handle JSON parsing
 */
async function fetchHeroConfig(): Promise<HeroConfig | null> {
    const response = await fetch("/api/hero", {
        credentials: "include",
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
            return null;
        }
        throw new Error(`Hero API error: ${response.status}`);
    }

    // Check if response is empty or null
    const text = await response.text();
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text) as HeroConfig;
    } catch {
        return null;
    }
}

/**
 * useHero hook
 * Fetches and manages hero configuration state
 * 
 * Features:
 * - React Query for caching and state management
 * - Type-safe responses
 * - Automatic retry on error
 * 
 * @param options - Optional React Query configuration
 */
export function useHero(
    options?: Omit<UseQueryOptions<HeroConfig | null, Error>, 'queryKey' | 'queryFn'>
) {
    return useQuery<HeroConfig | null, Error>({
        queryKey: heroQueryKeys.all,
        queryFn: fetchHeroConfig,
        retry: 1,
        staleTime: 60 * 1000, // 1 minute - matches server cache TTL
        ...options,
    });
}

/**
 * useHeroWithFallback hook
 * Returns hero config with fallback if API fails or returns null
 * 
 * @returns Object containing config, loading state, error, and fallback status
 */
export function useHeroWithFallback() {
    const { data, isLoading, error } = useHero();

    if (isLoading) {
        return {
            config: null,
            isLoading: true,
            error: null,
            isFallback: false,
        };
    }

    if (error) {
        console.warn("Hero config fetch failed, using fallback:", error);
        return {
            config: DEFAULT_HERO_CONFIG,
            isLoading: false,
            error,
            isFallback: true,
        };
    }

    if (!data) {
        return {
            config: DEFAULT_HERO_CONFIG,
            isLoading: false,
            error: null,
            isFallback: true,
        };
    }

    return {
        config: data,
        isLoading: false,
        error: null,
        isFallback: false,
    };
}

/**
 * Fetch hero carousel configuration from API
 */
async function fetchHeroCarouselConfig(): Promise<HeroConfig[]> {
    const response = await fetch("/api/hero/carousel", {
        credentials: "include",
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
            return [];
        }
        throw new Error(`Hero API error: ${response.status}`);
    }

    const text = await response.text();
    if (!text) return [];

    try {
        return JSON.parse(text) as HeroConfig[];
    } catch {
        return [];
    }
}

/**
 * useHeroCarousel hook
 * Fetches multiple active campaigns for the carousel
 */
export function useHeroCarousel(
    options?: Omit<UseQueryOptions<HeroConfig[], Error>, 'queryKey' | 'queryFn'>
) {
    return useQuery<HeroConfig[], Error>({
        queryKey: ["/api/hero/carousel"],
        queryFn: fetchHeroCarouselConfig,
        retry: 1,
        staleTime: 60 * 1000,
        ...options,
    });
}
