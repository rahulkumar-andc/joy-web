import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

interface CampaignBanner {
    id: number;
    name: string;
    type: string;
    content: {
        title: string;
        subtitle: string | null;
        cta: {
            label: string | null;
            href: string | null;
        };
        endTime: string | null;
    };
}

/**
 * PromotionalBanner - A site-wide banner for active campaigns
 * Shows at the top of pages when there's an active promotional campaign
 * Can be dismissed by the user (stored in sessionStorage)
 */
export function PromotionalBanner() {
    const [isDismissed, setIsDismissed] = useState(false);
    const [timeLeft, setTimeLeft] = useState<string>("");

    const { data: campaign } = useQuery<CampaignBanner | null>({
        queryKey: ["/api/hero"],
        staleTime: 60 * 1000, // 1 minute
    });

    // Check if banner was previously dismissed this session
    useEffect(() => {
        if (campaign?.id) {
            const dismissedId = sessionStorage.getItem("dismissed_banner");
            if (dismissedId === String(campaign.id)) {
                setIsDismissed(true);
            }
        }
    }, [campaign?.id]);

    // Countdown timer for flash sales
    useEffect(() => {
        if (!campaign?.content?.endTime) {
            setTimeLeft("");
            return;
        }

        const updateTimer = () => {
            const end = new Date(campaign.content.endTime!).getTime();
            const now = Date.now();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft("Ended");
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [campaign?.content?.endTime]);

    const handleDismiss = () => {
        if (campaign?.id) {
            sessionStorage.setItem("dismissed_banner", String(campaign.id));
        }
        setIsDismissed(true);
    };

    // Don't show banner for default campaigns or if dismissed
    if (!campaign || campaign.type === "default" || isDismissed) {
        return null;
    }

    // Style variants based on campaign type
    const bannerStyles: Record<string, string> = {
        sale: "bg-gradient-to-r from-red-600 to-pink-600",
        flash_sale: "bg-gradient-to-r from-orange-500 via-red-500 to-pink-500",
        festival: "bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400",
        default: "bg-gradient-to-r from-slate-800 to-slate-700",
    };

    const bannerClass = bannerStyles[campaign.type] || bannerStyles.default;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`${bannerClass} text-white relative overflow-hidden`}
            >
                <div className="container mx-auto px-4 py-2.5 flex items-center justify-center gap-4 text-sm">
                    {/* Animated background effect for flash sales */}
                    {campaign.type === "flash_sale" && (
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute -inset-full animate-pulse bg-white/10" />
                        </div>
                    )}

                    <span className="font-medium relative z-10">
                        {campaign.content.title}
                        {campaign.content.subtitle && (
                            <span className="hidden sm:inline ml-2 opacity-90">
                                — {campaign.content.subtitle}
                            </span>
                        )}
                    </span>

                    {/* Countdown timer */}
                    {timeLeft && timeLeft !== "Ended" && (
                        <span className="hidden md:inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-xs font-mono">
                            ⏰ {timeLeft}
                        </span>
                    )}

                    {/* CTA Button */}
                    {campaign.content.cta?.label && campaign.content.cta?.href && (
                        <Link href={campaign.content.cta.href}>
                            <button className="relative z-10 bg-white text-gray-900 px-3 py-1 rounded-full text-xs font-semibold hover:bg-gray-100 transition-colors">
                                {campaign.content.cta.label}
                            </button>
                        </Link>
                    )}

                    {/* Dismiss button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded transition-colors"
                        aria-label="Dismiss banner"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
