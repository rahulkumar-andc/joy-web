import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { CountdownTimer } from "./CountdownTimer";
import { apiRequest } from "@/lib/queryClient";

interface HeroOverlayProps {
    title: string;
    subtitle?: string | null;
    cta?: {
        label: string | null;
        href: string | null;
    };
    alignment: "left" | "center" | "right";
    opacity: number;
    textColor: string;
    endTime?: string | null;
    campaignId: number;
}

export function HeroOverlay({
    title,
    subtitle,
    cta,
    alignment,
    opacity,
    textColor,
    endTime,
    campaignId,
}: HeroOverlayProps) {
    const alignClass =
        alignment === "center"
            ? "text-center items-center"
            : alignment === "right"
                ? "text-right items-end"
                : "text-left items-start";

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.3,
            },
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 10,
            },
        },
    };

    const handleCtaClick = () => {
        if (campaignId) {
            apiRequest("POST", "/api/hero/analytics", {
                campaignId: campaignId,
                eventType: "click"
            }).catch(console.error);
        }
    };

    return (
        <div className="absolute inset-0 z-10 flex flex-col justify-center h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pointer-events-none">
            {/* Overlay Background */}
            <div
                className="absolute inset-0 bg-black pointer-events-none"
                style={{ opacity: opacity }}
            />

            {/* Content Container */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className={cn("relative z-20 flex flex-col max-w-3xl w-full", alignClass)}
                style={{ color: textColor }}
            >
                {endTime && (
                    <motion.div variants={itemVariants}>
                        <CountdownTimer targetDate={endTime} textColor={textColor} />
                    </motion.div>
                )}

                <motion.h1
                    variants={itemVariants}
                    className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4"
                >
                    {title}
                </motion.h1>

                {subtitle && (
                    <motion.p
                        variants={itemVariants}
                        className="text-lg md:text-2xl mb-8 opacity-90"
                    >
                        {subtitle}
                    </motion.p>
                )}

                {cta?.label && cta.href && (
                    <motion.div variants={itemVariants} className="pointer-events-auto">
                        <Link href={cta.href}>
                            <Button
                                size="lg"
                                className="text-lg px-8 py-6 rounded-full transition-transform hover:scale-105"
                                style={{
                                    backgroundColor: textColor,
                                    color: "black",
                                }}
                                onClick={handleCtaClick}
                            >
                                {cta.label}
                            </Button>
                        </Link>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
