import { useHero } from "../hooks/use-hero";
import { HeroMedia } from "./HeroMedia";
import { HeroOverlay } from "./HeroOverlay";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useHeroCarousel } from "../hooks/use-hero";
import { apiRequest } from "@/lib/queryClient";

export function HeroSystem() {
    // Legacy single hook (fallback)
    const { data: singleHero } = useHero();
    // New carousel hook
    const { data: carouselHeroes, isLoading } = useHeroCarousel();

    // State to track current slide index
    const [currentIndex, setCurrentIndex] = useState(0);
    const hasLoggedImpression = useRef<Set<number>>(new Set());

    // Determine which config to use (Carousel > Single > Default)
    const heroes = carouselHeroes && carouselHeroes.length > 0 ? carouselHeroes : (singleHero ? [singleHero] : []);

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
            overlay_opacity: 0.4,
            text_color: "#ffffff",
            id: 0,
        },
    };

    const currentHero = heroes.length > 0 ? heroes[currentIndex] : defaultConfig;

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
        if (currentHero?.ui?.id && !hasLoggedImpression.current.has(currentHero.ui.id)) {
            hasLoggedImpression.current.add(currentHero.ui.id);
            apiRequest("POST", "/api/hero/analytics", {
                campaignId: currentHero.ui.id,
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

    return (
        <section className="relative h-[80vh] min-h-[600px] w-full overflow-hidden bg-black text-white">
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
                        alignment={currentHero.ui.alignment}
                        opacity={currentHero.ui.overlay_opacity}
                        textColor={currentHero.ui.text_color}
                        endTime={currentHero.content.endTime}
                        campaignId={currentHero.ui.id}
                    />
                </motion.div>
            </AnimatePresence>

            {/* Carousel Indicators */}
            {heroes.length > 1 && (
                <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center gap-2">
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
        </section>
    );
}
