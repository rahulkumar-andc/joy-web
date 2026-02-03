import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

interface ScrollRevealProps {
    children: ReactNode;
    className?: string;
    direction?: "up" | "down" | "left" | "right" | "scale";
    delay?: number;
    duration?: number;
    threshold?: number;
    once?: boolean;
}

/**
 * A component that reveals its children with animation when scrolled into view
 * Perfect for creating engaging landing page sections
 */
export function ScrollReveal({
    children,
    className = "",
    direction = "up",
    delay = 0,
    duration = 0.6,
    threshold = 0.2,
    once = true,
}: ScrollRevealProps) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once, amount: threshold });

    const getInitialState = () => {
        switch (direction) {
            case "up":
                return { y: 60, opacity: 0 };
            case "down":
                return { y: -60, opacity: 0 };
            case "left":
                return { x: 60, opacity: 0 };
            case "right":
                return { x: -60, opacity: 0 };
            case "scale":
                return { scale: 0.8, opacity: 0 };
            default:
                return { y: 60, opacity: 0 };
        }
    };

    const getFinalState = () => {
        switch (direction) {
            case "up":
            case "down":
                return { y: 0, opacity: 1 };
            case "left":
            case "right":
                return { x: 0, opacity: 1 };
            case "scale":
                return { scale: 1, opacity: 1 };
            default:
                return { y: 0, opacity: 1 };
        }
    };

    return (
        <motion.div
            ref={ref}
            initial={getInitialState()}
            animate={isInView ? getFinalState() : getInitialState()}
            transition={{
                duration,
                delay,
                ease: [0.25, 0.1, 0.25, 1], // Smooth easing
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface ParallaxSectionProps {
    children: ReactNode;
    className?: string;
    speed?: number; // -1 to 1, negative = slower, positive = faster
    backgroundImage?: string;
}

/**
 * A parallax scrolling section for premium visual effects
 */
export function ParallaxSection({
    children,
    className = "",
    speed = 0.5,
    backgroundImage,
}: ParallaxSectionProps) {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });

    const y = useTransform(scrollYProgress, [0, 1], [0, speed * 200]);
    const smoothY = useSpring(y, { stiffness: 100, damping: 30 });

    return (
        <div ref={ref} className={`relative overflow-hidden ${className}`}>
            {backgroundImage && (
                <motion.div
                    style={{ y: smoothY }}
                    className="absolute inset-0 -top-20 -bottom-20 w-full"
                >
                    <img
                        src={backgroundImage}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                </motion.div>
            )}
            <div className="relative z-10">{children}</div>
        </div>
    );
}

interface StaggerContainerProps {
    children: ReactNode;
    className?: string;
    staggerDelay?: number;
}

/**
 * Container that staggers its children animations
 */
export function StaggerContainer({
    children,
    className = "",
    staggerDelay = 0.1,
}: StaggerContainerProps) {
    const ref = useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={{
                hidden: { opacity: 0 },
                visible: {
                    opacity: 1,
                    transition: {
                        staggerChildren: staggerDelay,
                        delayChildren: 0.1,
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface StaggerItemProps {
    children: ReactNode;
    className?: string;
}

/**
 * Individual item to be used within StaggerContainer
 */
export function StaggerItem({ children, className = "" }: StaggerItemProps) {
    return (
        <motion.div
            variants={{
                hidden: { y: 30, opacity: 0 },
                visible: {
                    y: 0,
                    opacity: 1,
                    transition: {
                        type: "spring",
                        stiffness: 100,
                        damping: 12,
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/**
 * Scroll indicator arrow that bounces to encourage scrolling
 */
export function ScrollIndicator({ className = "" }: { className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.5 }}
            className={`flex flex-col items-center ${className}`}
        >
            <span className="text-xs uppercase tracking-widest mb-2 text-white/60">
                Scroll
            </span>
            <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
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
            </motion.div>
        </motion.div>
    );
}

/**
 * Text reveal animation that types out character by character
 */
export function TextReveal({
    text,
    className = "",
    delay = 0,
}: {
    text: string;
    className?: string;
    delay?: number;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true });

    return (
        <span ref={ref} className={className}>
            {text.split("").map((char, index) => (
                <motion.span
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    transition={{
                        duration: 0.3,
                        delay: delay + index * 0.03,
                        ease: "easeOut",
                    }}
                    style={{ display: "inline-block" }}
                >
                    {char === " " ? "\u00A0" : char}
                </motion.span>
            ))}
        </span>
    );
}

/**
 * Counter animation that counts up from 0 to a target number
 */
export function CounterAnimation({
    target,
    duration = 2,
    suffix = "",
    prefix = "",
    className = "",
}: {
    target: number;
    duration?: number;
    suffix?: string;
    prefix?: string;
    className?: string;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true });
    const springValue = useSpring(0, { duration: duration * 1000 });

    if (isInView) {
        springValue.set(target);
    }

    return (
        <motion.span ref={ref} className={className}>
            {prefix}
            <motion.span>{springValue}</motion.span>
            {suffix}
        </motion.span>
    );
}

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
}

/**
 * Wraps page content with a smooth fade/slide transition
 * Use this as the root element of each page component
 */
export function PageTransition({ children, className = "" }: PageTransitionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
                duration: 0.3,
                ease: [0.25, 0.1, 0.25, 1],
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface HoverScaleProps {
    children: ReactNode;
    className?: string;
    scale?: number;
    duration?: number;
}

/**
 * Adds a subtle scale effect on hover for interactive elements
 * Great for cards, buttons, and clickable items
 */
export function HoverScale({
    children,
    className = "",
    scale = 1.02,
    duration = 0.2
}: HoverScaleProps) {
    return (
        <motion.div
            whileHover={{ scale }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface HoverLiftProps {
    children: ReactNode;
    className?: string;
    shadow?: boolean;
}

/**
 * Lifts element on hover with optional shadow enhancement
 * Perfect for product cards and featured items
 */
export function HoverLift({ children, className = "", shadow = true }: HoverLiftProps) {
    return (
        <motion.div
            whileHover={{
                y: -8,
                boxShadow: shadow ? "0 20px 40px rgba(0,0,0,0.15)" : undefined
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/**
 * Animated skeleton loader with shimmer effect
 */
export function SkeletonPulse({ className = "" }: { className?: string }) {
    return (
        <motion.div
            className={`bg-muted rounded ${className}`}
            animate={{
                opacity: [0.5, 1, 0.5],
            }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
            }}
        />
    );
}

interface SkeletonCardProps {
    className?: string;
}

/**
 * Pre-built skeleton for product/content cards
 */
export function SkeletonCard({ className = "" }: SkeletonCardProps) {
    return (
        <div className={`space-y-3 ${className}`}>
            <SkeletonPulse className="aspect-square w-full" />
            <SkeletonPulse className="h-4 w-3/4" />
            <SkeletonPulse className="h-4 w-1/2" />
            <SkeletonPulse className="h-6 w-1/3" />
        </div>
    );
}

/**
 * Animated dots loader for inline loading states
 */
export function DotsLoader({ className = "" }: { className?: string }) {
    return (
        <div className={`flex gap-1 ${className}`}>
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    className="w-2 h-2 bg-primary rounded-full"
                    animate={{ y: [0, -6, 0] }}
                    transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
}

/**
 * Smooth drawer/modal backdrop animation
 */
export function ModalBackdrop({
    isOpen,
    onClick
}: {
    isOpen: boolean;
    onClick?: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isOpen ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClick}
        />
    );
}

interface SlideInDrawerProps {
    children: ReactNode;
    isOpen: boolean;
    direction?: "left" | "right" | "bottom";
    className?: string;
}

/**
 * Animated drawer that slides in from edge of screen
 */
export function SlideInDrawer({
    children,
    isOpen,
    direction = "right",
    className = ""
}: SlideInDrawerProps) {
    const getInitialPosition = () => {
        switch (direction) {
            case "left": return { x: "-100%" };
            case "right": return { x: "100%" };
            case "bottom": return { y: "100%" };
        }
    };

    const getFinalPosition = () => {
        switch (direction) {
            case "left":
            case "right": return { x: 0 };
            case "bottom": return { y: 0 };
        }
    };

    return (
        <motion.div
            initial={getInitialPosition()}
            animate={isOpen ? getFinalPosition() : getInitialPosition()}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/**
 * Success checkmark animation
 */
export function SuccessCheckmark({ className = "" }: { className?: string }) {
    return (
        <motion.svg
            className={`w-16 h-16 text-green-500 ${className}`}
            viewBox="0 0 52 52"
            initial="hidden"
            animate="visible"
        >
            <motion.circle
                cx="26"
                cy="26"
                r="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            />
            <motion.path
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 27l8 8 16-16"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
            />
        </motion.svg>
    );
}

