import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { CountdownTimer } from "./CountdownTimer";
import { SocialProof } from "./SocialProof";
import { apiRequest } from "@/lib/queryClient";
import { Share2, Heart } from "lucide-react";

interface HeroOverlayProps {
    title: string;
    subtitle?: string | null;
    cta?: {
        label: string | null;
        href: string | null;
    };
    // Smart CTAs - secondary CTA support
    secondaryCta?: {
        label: string | null;
        href: string | null;
    };
    alignment: "left" | "center" | "right";
    opacity: number;
    textColor: string;
    endTime?: string | null;
    campaignId: number;
    // Animation type
    animationType?: "fade" | "slide" | "zoom" | "none";
    // Social features
    showSocialProof?: boolean;
    showShareButtons?: boolean;
}

// Animation variants based on type
const getAnimationVariants = (type: string, prefersReducedMotion: boolean) => {
    if (prefersReducedMotion || type === "none") {
        return {
            container: { hidden: {}, visible: {} },
            item: { hidden: {}, visible: {} },
        };
    }

    switch (type) {
        case "slide":
            return {
                container: {
                    hidden: { opacity: 0 },
                    visible: {
                        opacity: 1,
                        transition: { staggerChildren: 0.15, delayChildren: 0.2 },
                    },
                },
                item: {
                    hidden: { x: -50, opacity: 0 },
                    visible: {
                        x: 0,
                        opacity: 1,
                        transition: { type: "spring", stiffness: 80, damping: 12 },
                    },
                },
            };
        case "zoom":
            return {
                container: {
                    hidden: { opacity: 0 },
                    visible: {
                        opacity: 1,
                        transition: { staggerChildren: 0.1, delayChildren: 0.1 },
                    },
                },
                item: {
                    hidden: { scale: 0.8, opacity: 0 },
                    visible: {
                        scale: 1,
                        opacity: 1,
                        transition: { type: "spring", stiffness: 100, damping: 10 },
                    },
                },
            };
        case "fade":
        default:
            return {
                container: {
                    hidden: { opacity: 0 },
                    visible: {
                        opacity: 1,
                        transition: { staggerChildren: 0.2, delayChildren: 0.3 },
                    },
                },
                item: {
                    hidden: { y: 20, opacity: 0 },
                    visible: {
                        y: 0,
                        opacity: 1,
                        transition: { type: "spring", stiffness: 100, damping: 10 },
                    },
                },
            };
    }
};

export function HeroOverlay({
    title,
    subtitle,
    cta,
    secondaryCta,
    alignment,
    opacity,
    textColor,
    endTime,
    campaignId,
    animationType = "fade",
    showSocialProof = false,
    showShareButtons = false,
}: HeroOverlayProps) {
    // Accessibility: Respect reduced motion preference
    const prefersReducedMotion = useReducedMotion() ?? false;
    const variants = getAnimationVariants(animationType, prefersReducedMotion);

    const alignClass =
        alignment === "center"
            ? "text-center items-center"
            : alignment === "right"
                ? "text-right items-end"
                : "text-left items-start";

    const handleCtaClick = () => {
        if (campaignId) {
            apiRequest("POST", "/api/hero/analytics", {
                campaignId: campaignId,
                eventType: "click"
            }).catch(console.error);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: subtitle || "",
                    url: window.location.href,
                });
            } catch (err) {
                console.error("Share failed:", err);
            }
        }
    };

    return (
        <div
            className="absolute inset-0 z-10 flex flex-col justify-center h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pointer-events-none"
            role="region"
            aria-label="Hero campaign"
        >
            {/* Overlay Background */}
            <div
                className="absolute inset-0 bg-black pointer-events-none"
                style={{ opacity: opacity }}
                aria-hidden="true"
            />

            {/* Content Container */}
            <motion.div
                variants={variants.container}
                initial="hidden"
                animate="visible"
                className={cn(
                    "relative z-20 flex flex-col max-w-3xl w-full p-6 sm:p-8 rounded-2xl backdrop-blur-md bg-white/5 border border-white/10 shadow-2xl",
                    alignClass
                )}
                style={{ color: textColor }}
            >
                {/* Countdown Timer */}
                {endTime && (
                    <motion.div variants={variants.item} className="mb-4">
                        <CountdownTimer targetDate={endTime} />
                    </motion.div>
                )}

                {/* Title */}
                <motion.h1
                    variants={variants.item}
                    className="text-3xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-4 drop-shadow-sm"
                    tabIndex={0}
                >
                    {title}
                </motion.h1>

                {/* Subtitle */}
                {subtitle && (
                    <motion.p
                        variants={variants.item}
                        className="text-lg md:text-xl lg:text-2xl opacity-90 max-w-xl mb-8 leading-relaxed drop-shadow-sm"
                    >
                        {subtitle}
                    </motion.p>
                )}

                {/* Social Proof */}
                {showSocialProof && campaignId > 0 && (
                    <motion.div variants={variants.item} className="mb-6 pointer-events-auto">
                        <SocialProof campaignId={campaignId} />
                    </motion.div>
                )}

                {/* CTA Buttons */}
                <motion.div
                    variants={variants.item}
                    className="flex flex-wrap gap-4 pointer-events-auto"
                    role="group"
                    aria-label="Call to action buttons"
                >
                    {/* Primary CTA */}
                    {cta?.label && cta.href && (
                        <Link href={cta.href}>
                            <Button
                                size="lg"
                                className="text-lg px-8 py-6 rounded-full transition-transform hover:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-white"
                                style={{
                                    backgroundColor: textColor,
                                    color: "black",
                                }}
                                onClick={handleCtaClick}
                                aria-label={`${cta.label} - Primary action`}
                            >
                                {cta.label}
                            </Button>
                        </Link>
                    )}

                    {/* Secondary CTA */}
                    {secondaryCta?.label && secondaryCta.href && (
                        <Link href={secondaryCta.href}>
                            <Button
                                size="lg"
                                variant="outline"
                                className="text-lg px-8 py-6 rounded-full border-2 transition-transform hover:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-white"
                                style={{
                                    borderColor: textColor,
                                    color: textColor,
                                }}
                                aria-label={`${secondaryCta.label} - Secondary action`}
                            >
                                {secondaryCta.label}
                            </Button>
                        </Link>
                    )}

                    {/* Share Buttons */}
                    {showShareButtons && (
                        <div className="flex gap-2">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-full w-12 h-12 bg-white/10 hover:bg-white/20 transition-all"
                                style={{ color: textColor }}
                                onClick={handleShare}
                                aria-label="Share this campaign"
                            >
                                <Share2 className="h-5 w-5" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-full w-12 h-12 bg-white/10 hover:bg-white/20 transition-all"
                                style={{ color: textColor }}
                                aria-label="Save to wishlist"
                            >
                                <Heart className="h-5 w-5" />
                            </Button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
}
