import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { CountdownTimer } from "./CountdownTimer";
import { SocialProof } from "./SocialProof";
import { apiRequest } from "@/lib/queryClient";
import { Share2, Heart } from "lucide-react";

// Helper to strip HTML underline tags from text
const stripUnderlineTags = (text: string | null | undefined): string | null => {
    if (!text) return null;
    // Remove <u> and </u> tags while preserving the text content
    return text.replace(/<\/?u>/gi, '');
};

interface HeroOverlayProps {
    title: string;
    subtitle?: string | null;
    cta?: {
        label: string | null;
        href: string | null;
    };
    secondaryCta?: {
        label: string | null;
        href: string | null;
    };
    // Positioning (Offsets in pixels)
    titleOffsetX?: number;
    titleOffsetY?: number;
    subtitleOffsetX?: number;
    subtitleOffsetY?: number;
    ctaOffsetX?: number;
    ctaOffsetY?: number;
    countdownOffsetX?: number;
    countdownOffsetY?: number;

    alignment: "left" | "center" | "right";
    opacity: number;
    textColor: string;
    endTime?: string | null;
    campaignId: number;
    animationType?: "fade" | "slide" | "zoom" | "none";
    showSocialProof?: boolean;
    showShareButtons?: boolean;

    // New Styling
    titleFontSize?: number | null;
    subtitleFontSize?: number | null;
    fontWeight?: "normal" | "bold";
    overlayColor?: "black" | "gradient" | "brand";
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
    // Destructure new position props with defaults or fallbacks
    titleOffsetX = 0,
    titleOffsetY = 0,
    subtitleOffsetX = 0,
    subtitleOffsetY = 50,
    ctaOffsetX = 0,
    ctaOffsetY = 100,
    countdownOffsetX = 0,
    countdownOffsetY = -100,

    alignment, // Kept for backward compatibility or text-align
    opacity, // Not used primarily in this new layout but good to keep
    textColor,
    endTime,
    campaignId,
    animationType = "fade",
    showSocialProof = false,
    showShareButtons = false,

    // New Styling Defaults
    titleFontSize,
    subtitleFontSize,
    fontWeight = "normal",
    overlayColor = "black",
}: HeroOverlayProps) {
    // Accessibility: Respect reduced motion preference
    const prefersReducedMotion = useReducedMotion() ?? false;
    const variants = getAnimationVariants(animationType, prefersReducedMotion);

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

    // Helper for absolute positioning from CENTER
    // x/y are pixel offsets from the center of the container
    const getPosStyle = (xOffset?: number, yOffset?: number) => ({
        left: '50%',
        top: '50%',
        transform: `translate(calc(-50% + ${xOffset ?? 0}px), calc(-50% + ${yOffset ?? 0}px))`,
        position: "absolute" as const,
        zIndex: 20,
        width: 'max-content',
        maxWidth: '90%'
    });

    // Helper for Overlay Background
    const getOverlayClass = () => {
        switch (overlayColor) {
            case "gradient":
                return "bg-gradient-to-t from-black via-black/50 to-transparent";
            case "brand":
                return "bg-primary mix-blend-multiply"; // Use brand color
            case "black":
            default:
                return "bg-black";
        }
    };

    return (
        <div
            className="absolute inset-0 z-10 overflow-hidden pointer-events-none"
            role="region"
            aria-label="Hero campaign"
        >
            {/* Background Overlay */}
            <div
                className={cn("absolute inset-0 transition-opacity duration-500", getOverlayClass())}
                style={{ opacity: opacity }}
            />

            {/* Content Container - using motion for global fade/stagger, but positioning is individual */}
            <motion.div
                variants={variants.container}
                initial="hidden"
                animate="visible"
                className="w-full h-full relative"
                style={{ color: textColor }}
            >
                {/* Countdown Timer */}
                {endTime && (
                    <motion.div
                        variants={variants.item}
                        style={getPosStyle(countdownOffsetX, countdownOffsetY)}
                    >
                        <CountdownTimer targetDate={endTime} />
                    </motion.div>
                )}

                {/* Title */}
                <motion.h1
                    variants={variants.item}
                    className={cn(
                        "text-3xl md:text-5xl lg:text-7xl tracking-tight drop-shadow-sm text-center",
                        fontWeight === "bold" ? "font-bold" : "font-normal"
                    )}
                    tabIndex={0}
                    style={{
                        ...getPosStyle(titleOffsetX, titleOffsetY),
                        fontSize: titleFontSize ? `${titleFontSize}px` : undefined,
                    }}
                >
                    {title}
                </motion.h1>

                {/* Subtitle */}
                {subtitle && (
                    <motion.p
                        variants={variants.item}
                        className="text-lg md:text-xl lg:text-2xl opacity-90 leading-relaxed drop-shadow-sm text-center max-w-2xl"
                        style={{
                            ...getPosStyle(subtitleOffsetX, subtitleOffsetY),
                            fontSize: subtitleFontSize ? `${subtitleFontSize}px` : undefined,
                        }}
                    >
                        {stripUnderlineTags(subtitle)}
                    </motion.p>
                )}

                {/* CTA Buttons */}
                <motion.div
                    variants={variants.item}
                    className="flex flex-wrap gap-4 justify-center pointer-events-auto"
                    role="group"
                    aria-label="Call to action buttons"
                    style={getPosStyle(ctaOffsetX, ctaOffsetY)}
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
                                className="text-lg px-8 py-6 rounded-full border-2 transition-transform hover:scale-105 focus:ring-2 focus:ring-offset-2 focus:ring-white backdrop-blur-sm"
                                style={{
                                    borderColor: textColor,
                                    color: textColor,
                                }}
                                onClick={handleCtaClick}
                            >
                                {secondaryCta.label}
                            </Button>
                        </Link>
                    )}

                    {/* Social Proof & Share - bundled with CTA area for now, or could be separate */}
                    {showShareButtons && (
                        <div className="flex gap-2">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-full w-12 h-12 bg-white/10 hover:bg-white/20 transition-all"
                                style={{ color: textColor }}
                                onClick={handleShare}
                            >
                                <Share2 className="h-5 w-5" />
                            </Button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
}
