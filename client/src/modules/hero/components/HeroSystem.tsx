import { useHeroWithFallback } from "../hooks/use-hero";
import { HeroMedia } from "./HeroMedia";
import { HeroOverlay } from "./HeroOverlay";
<<<<<<< HEAD
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
            titleOffsetX: 0,
            titleOffsetY: 0,
            subtitleOffsetX: 0,
            subtitleOffsetY: 50,
            ctaOffsetX: 0,
            ctaOffsetY: 100,
            countdownOffsetX: 0,
            countdownOffsetY: -100,
            // Defaults for new fields
            titleFontSize: null,
            subtitleFontSize: null,
            fontWeight: "normal",
            overlayColor: "black",
            // Dynamic Styling (2025)
            titleColor: "#ffffff",
            subtitleColor: "#ffffff",
            buttonColor: "#ffffff",
            fontFamily: "Inter",
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

    // Debug: Log dimensions for verification
    useEffect(() => {
        const checkDimensions = () => {
            const el = document.getElementById('hero-main-container');
            if (el) {
                console.log(`[HeroSystem] ${el.offsetWidth}x${el.offsetHeight}`);
            }
        };
        window.addEventListener('resize', checkDimensions);
        checkDimensions(); // Initial check - might be null if loading but safe

        // Poll once after loading cleared
        if (!isLoading) {
            setTimeout(checkDimensions, 500);
        }

        return () => window.removeEventListener('resize', checkDimensions);
    }, [isLoading]);

    // Skeleton loading
    if (isLoading && heroes.length === 0) {
        return (
            <div className="relative h-[100vh] min-h-[720px] w-full bg-muted overflow-hidden">
                <Skeleton className="absolute inset-0 w-full h-full" />
                <div className="absolute inset-0 flex flex-col justify-center items-start z-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                    <Skeleton className="h-16 w-3/4 mb-4" />
                    <Skeleton className="h-8 w-1/2 mb-8" />
                    <Skeleton className="h-12 w-32 rounded-full" />
                </div>
=======

export function HeroSystem() {
    // Use the fallback hook to ensure we always have something to show
    // or handle the loading state gracefully.
    const { config, isLoading } = useHeroWithFallback();

    // While loading, we could show a skeleton, but for now we'll rely on the
    // HeroMedia's internal loading state if we had a config, or just render nothing/skeleton.
    // However, useHeroWithFallback returns null config only if loading is true.
    if (isLoading || !config) {
        return (
            <div className="relative w-full h-[600px] bg-muted animate-pulse overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-muted to-muted/50" />
>>>>>>> 9197ee2 (vivek-showcase)
            </div>
        );
    }

<<<<<<< HEAD


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
                        titleOffsetX={currentHero.ui.titleOffsetX ?? 0}
                        titleOffsetY={currentHero.ui.titleOffsetY ?? 0}
                        subtitleOffsetX={currentHero.ui.subtitleOffsetX ?? 0}
                        subtitleOffsetY={currentHero.ui.subtitleOffsetY ?? 50}
                        ctaOffsetX={currentHero.ui.ctaOffsetX ?? 0}
                        ctaOffsetY={currentHero.ui.ctaOffsetY ?? 100}
                        countdownOffsetX={currentHero.ui.countdownOffsetX ?? 0}
                        countdownOffsetY={currentHero.ui.countdownOffsetY ?? -100}

                        // New Styling Props
                        titleFontSize={(currentHero.ui as any).titleFontSize}
                        subtitleFontSize={(currentHero.ui as any).subtitleFontSize}
                        fontWeight={(currentHero.ui as any).fontWeight || 'normal'}
                        overlayColor={(currentHero.ui as any).overlayColor || 'black'}

                        // Dynamic Colors & Fonts (2025)
                        titleColor={(currentHero.ui as any).titleColor || '#ffffff'}
                        subtitleColor={(currentHero.ui as any).subtitleColor || '#ffffff'}
                        buttonColor={(currentHero.ui as any).buttonColor || '#ffffff'}
                        fontFamily={(currentHero.ui as any).fontFamily || 'Inter'}
                    />
                </motion.div>
            </AnimatePresence>
=======
    const { media, content, ui } = config;

    return (
        <section className="relative w-full h-[600px] md:h-[700px] overflow-hidden bg-background">
            {/* Background Media Layer */}
            <HeroMedia
                type={media.type}
                url={media.url}
                alt={content.title}
            // If we support carousel in the future, media.images would be passed here
            />
>>>>>>> 9197ee2 (vivek-showcase)

            {/* Overlay/Content Layer */}
            <HeroOverlay
                title={content.title}
                subtitle={content.subtitle}
                cta={content.cta}
                // secondaryCta can be added to the schema later if needed

                // Positioning
                titlePosX={ui.titlePosX}
                titlePosY={ui.titlePosY}
                subtitlePosX={ui.subtitlePosX}
                subtitlePosY={ui.subtitlePosY}
                ctaPosX={ui.ctaPosX}
                ctaPosY={ui.ctaPosY}
                countdownPosX={ui.countdownPosX}
                countdownPosY={ui.countdownPosY}

                // Styling
                alignment={ui.alignment}
                opacity={ui.overlay_opacity}
                textColor={ui.text_color}

                // Metadata
                endTime={content.endTime}
                campaignId={ui.id}
            />
        </section>
    );
}
