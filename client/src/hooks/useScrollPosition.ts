import { useState, useEffect, useCallback } from 'react';

interface ScrollPosition {
    scrollY: number;
    scrollDirection: 'up' | 'down' | null;
    isAtTop: boolean;
    hasScrolled: boolean;
}

/**
 * Performance-optimized scroll position hook for header animations
 * Uses RAF throttling to prevent jank
 */
export function useScrollPosition(threshold: number = 10): ScrollPosition {
    const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
        scrollY: 0,
        scrollDirection: null,
        isAtTop: true,
        hasScrolled: false,
    });

    const handleScroll = useCallback(() => {
        const currentScrollY = window.scrollY;

        setScrollPosition((prev) => {
            const scrollDirection = currentScrollY > prev.scrollY ? 'down' : 'up';
            const isAtTop = currentScrollY <= threshold;
            const hasScrolled = currentScrollY > threshold;

            // Only update if values actually changed
            if (
                prev.scrollY === currentScrollY &&
                prev.scrollDirection === scrollDirection &&
                prev.isAtTop === isAtTop &&
                prev.hasScrolled === hasScrolled
            ) {
                return prev;
            }

            return {
                scrollY: currentScrollY,
                scrollDirection,
                isAtTop,
                hasScrolled,
            };
        });
    }, [threshold]);

    useEffect(() => {
        let rafId: number | null = null;
        let ticking = false;

        const onScroll = () => {
            if (!ticking) {
                rafId = requestAnimationFrame(() => {
                    handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        };

        // Initial check
        handleScroll();

        window.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', onScroll);
            if (rafId) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [handleScroll]);

    return scrollPosition;
}
