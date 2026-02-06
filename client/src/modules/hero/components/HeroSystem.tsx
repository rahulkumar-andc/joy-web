import { useHero } from "../hooks/use-hero";
import { HeroMedia } from "./HeroMedia";
import { HeroOverlay } from "./HeroOverlay";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useHeroCarousel } from "../hooks/use-hero";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";

export function HeroSystem() {
    // Legacy single hook (fallback)
    const { data: singleHero } = useHero();
    // New carousel hook
    const { data: carouselHeroes, isLoading } = useHeroCarousel();
    const isMobile = useIsMobile();

    // State to track current slide index
    const [currentIndex, setCurrentIndex] = useState(0);
    const hasLoggedImpression = useRef<Set<number>>(new Set());

    // Determine which config to use (Carousel > Single > Default)
    // Filter by device target logic
    const allHeroes = carouselHeroes && carouselHeroes.length > 0 ? carouselHeroes : (singleHero ? [singleHero] : []);

    const heroes = allHeroes.filter(hero => {
        // Safe check for new fields if they don't exist yet (backward compatibility)
        const target = hero.ui.deviceTarget || 'all';
        if (target === 'all') return true;
        if (target === 'mobile' && isMobile) return true;
        if (target === 'desktop' && !isMobile) return true;
        return false;
    });

    // Default fallback if absolutely nothing exists
    const defaultConfig = {
        media: {
            type: "image" as const,
            url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=3870&auto=format&fit=crop",
        },
        content: {
            title: "Elevate Your Style",
            subtitle: "Discover the new collection defined by elegance and comfort.",
            cta: { label: "Shop Collection", href: "/shop" },
            endTime: null,
        },
        ui: {
            alignment: "left" as const,
            overlayOpacity: 0.4,
            textColor: "#ffffff",
            id: 0,
            titlePosX: 50,
            titlePosY: 20,
            subtitlePosX: 50,
            subtitlePosY: 40,
            ctaPosX: 50,
            ctaPosY: 60,
            countdownPosX: 50,
            countdownPosY: 10,
            // Defaults for new fields
            titleFontSize: null,
            subtitleFontSize: null,
            fontWeight: "normal",
            overlayColor: "black",
        },
    };

    const currentHero = heroes.length > 0 ? heroes[currentIndex] : defaultConfig;

    // Reset index if filtered heroes change and index is out of bounds
    useEffect(() => {
        if (currentIndex >= heroes.length && heroes.length > 0) {
            setCurrentIndex(0);
        }
    }, [heroes.length, currentIndex]);

    // Auto-advance carousel
    useEffect(() => {
        if (heroes.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % heroes.length);
        }, 5000); // 5 seconds per slide

        return () => clearInterval(timer);
    }, [heroes.length]);

    // Analytics tracking
    useEffect(() => {
        // Only track if analytics enabled (checked on backend too, but save reqs here)
        // Check both old 'id' location and potentially new fields if we expand DTO
        const heroId = currentHero?.ui?.id;
        const enableAnalytics = (currentHero?.ui as any).enableAnalytics; // Cast because DTO might not be fully updated in typescript defs yet

        if (heroId && enableAnalytics && !hasLoggedImpression.current.has(heroId)) {
            hasLoggedImpression.current.add(heroId);
            apiRequest("POST", "/api/hero/analytics", {
                campaignId: heroId,
                eventType: "impression"
            }).catch(console.error);
        }
    }, [currentHero?.ui?.id]);

    // Skeleton loading
    if (isLoading && heroes.length === 0) {
        return (
            <div className="relative h-[80vh] w-full bg-muted overflow-hidden">
                <Skeleton className="absolute inset-0 w-full h-full" />
                <div className="absolute inset-0 flex flex-col justify-center items-start z-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                    <Skeleton className="h-16 w-3/4 mb-4" />
                    <Skeleton className="h-8 w-1/2 mb-8" />
                    <Skeleton className="h-12 w-32 rounded-full" />
                </div>
            </div>
        );
    }

    // Debug: Log dimensions for verification
    useEffect(() => {
        const checkDimensions = () => {
            const el = document.getElementById('hero-main-container');
            if (el) {
                console.log(`[HeroSystem] ${el.offsetWidth}x${el.offsetHeight}`);
            }
        };
        window.addEventListener('resize', checkDimensions);
        checkDimensions();
        return () => window.removeEventListener('resize', checkDimensions);
    }, []);

    return (
    return (
        <section id="hero-main-container" className="relative w-full h-[100vh] min-h-[720px] overflow-hidden bg-black text-white">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentHero.ui.id || 'default'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 w-full h-full"
                >
                    <HeroMedia type={currentHero.media.type} url={currentHero.media.url} />
                    <HeroOverlay
                        title={currentHero.content.title}
                        subtitle={currentHero.content.subtitle}
                        cta={currentHero.content.cta}
                        // New Secondary CTA
                        secondaryCta={(currentHero.ui as any).secondaryCta}

                        alignment={currentHero.ui.alignment}
                        opacity={currentHero.ui.overlayOpacity ?? (currentHero.ui as any).overlay_opacity ?? 0.4}
                        textColor={currentHero.ui.textColor ?? (currentHero.ui as any).text_color ?? "#ffffff"}
                        endTime={currentHero.content.endTime}
                        campaignId={currentHero.ui.id}

                        // Positioning
                        titlePosX={currentHero.ui.titlePosX ?? 50}
                        titlePosY={currentHero.ui.titlePosY ?? 20}
                        subtitlePosX={currentHero.ui.subtitlePosX ?? 50}
                        subtitlePosY={currentHero.ui.subtitlePosY ?? 40}
                        ctaPosX={currentHero.ui.ctaPosX ?? 50}
                        ctaPosY={currentHero.ui.ctaPosY ?? 60}
                        countdownPosX={currentHero.ui.countdownPosX ?? 50}
                        countdownPosY={currentHero.ui.countdownPosY ?? 10}

                        // New Styling Props
                        titleFontSize={(currentHero.ui as any).titleFontSize}
                        subtitleFontSize={(currentHero.ui as any).subtitleFontSize}
                        fontWeight={(currentHero.ui as any).fontWeight || 'normal'}
                        overlayColor={(currentHero.ui as any).overlayColor || 'black'}
                    />
                </motion.div>
            </AnimatePresence>

            {/* Carousel Indicators */}
            {heroes.length > 1 && (
                <div className="absolute bottom-20 left-0 right-0 z-30 flex justify-center gap-2">
                    {heroes.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-2 w-2 rounded-full transition-all ${idx === currentIndex ? "bg-white w-6" : "bg-white/50 hover:bg-white/80"}`}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            )}

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-0 right-0 z-30 flex flex-col items-center animate-bounce">
                <span className="text-xs uppercase tracking-widest mb-2 text-white/60">Scroll</span>
                <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/60"
                >
                    <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
            </div>
        </section>
    );
}
