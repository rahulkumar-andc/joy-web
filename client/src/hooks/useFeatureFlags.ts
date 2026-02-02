import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

/**
 * React hook for feature flags
 * Fetches feature flags for current user and provides helper to check if enabled
 */
export function useFeatureFlags() {
    const { data: flags = {}, isLoading, error } = useQuery({
        queryKey: ['/api/feature-flags'],
        queryFn: async () => {
            const res = await apiRequest('GET', '/api/feature-flags');
            return res.json() as Promise<Record<string, boolean>>;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    });

    /**
     * Check if a feature flag is enabled
     */
    const isEnabled = (flagName: string): boolean => {
        return flags[flagName] === true;
    };

    return { flags, isEnabled, isLoading, error };
}

/**
 * Common feature flag names (for type safety)
 */
export const FEATURE_FLAGS = {
    // Payment
    NEW_PAYMENT_GATEWAY: 'new_payment_gateway',
    COD_ENABLED: 'cod_enabled',

    // UI
    NEW_CHECKOUT_UI: 'new_checkout_ui',
    DARK_MODE: 'dark_mode',

    // Features
    PRODUCT_RECOMMENDATIONS: 'product_recommendations',
    WISHLIST: 'wishlist',
    RECENTLY_VIEWED: 'recently_viewed',

    // Business
    FLASH_SALES: 'flash_sales',
    LOYALTY_PROGRAM: 'loyalty_program',

    // Maintenance
    CHECKOUT_DISABLED: 'checkout_disabled',
    READ_ONLY_MODE: 'read_only_mode',
} as const;
