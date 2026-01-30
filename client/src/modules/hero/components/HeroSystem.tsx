import { useHero } from "../hooks/use-hero";
import { HeroMedia } from "./HeroMedia";
import { HeroOverlay } from "./HeroOverlay";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

export function HeroSystem() {
    const { data: heroConfig, isLoading, error } = useHero();
    const hasLoggedImpression = useRef(false);

    useEffect(() => {
        if (heroConfig?.ui?.id && !hasLoggedImpression.current) {
            hasLoggedImpression.current = true;
            // Fire and forget impression
            apiRequest("POST", "/api/hero/analytics", {
                campaignId: heroConfig.ui.id,
                eventType: "impression"
            }).catch(console.error);
        }
    }, [heroConfig?.ui?.id]);

    // Skeleton loading state to prevent CLS
    if (isLoading) {
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

    // Graceful degradation / Default fallback if API fails or returns null
    // In a real scenario, this matches the "Default" campaign properties hardcoded
    const config = heroConfig || {
        media: {
            type: "image" as const,
            url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=3870&auto=format&fit=crop", // Elegant default
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
            alignment: "left" as const,
            overlay_opacity: 0.4,
            text_color: "#ffffff",
            id: 0,
        },
    };

    return (
        <section className="relative h-[80vh] min-h-[600px] w-full overflow-hidden bg-black text-white">
            <AnimatePresence mode="wait">
                {/* We use id as key to trigger full re-mount animations on campaign switch */}
                <motion.div
                    key={config.ui.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 w-full h-full"
                >
                    {/* Media Layer */}
                    <HeroMedia type={config.media.type} url={config.media.url} />

                    {/* Overlay Layer */}
                    <HeroOverlay
                        title={config.content.title}
                        subtitle={config.content.subtitle}
                        cta={config.content.cta}
                        alignment={config.ui.alignment}
                        opacity={config.ui.overlay_opacity}
                        textColor={config.ui.text_color}
                        endTime={config.content.endTime}
                        campaignId={config.ui.id}
                    />
                </motion.div>
            </AnimatePresence>
        </section>
    );
}
