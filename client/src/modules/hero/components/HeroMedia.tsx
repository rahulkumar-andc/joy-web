import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface HeroMediaProps {
    type: "image" | "video";
    url: string;
    alt?: string;
    // New: Support multiple images for internal carousel
    images?: string[];
    // Lazy loading
    lazy?: boolean;
}

// WebP/AVIF support detection
const supportsWebP = (() => {
    if (typeof window === "undefined") return true;
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").indexOf("image/webp") > -1;
})();

const supportsAVIF = (() => {
    if (typeof window === "undefined") return false;
    // AVIF support is limited, return false by default for safety
    return false;
})();

// Get optimized image URL (convert to WebP if supported)
function getOptimizedUrl(url: string): string {
    if (!supportsWebP) return url;

    // If using a CDN that supports format conversion, add format param
    if (url.includes("unsplash.com")) {
        return url.includes("?") ? `${url}&fm=webp` : `${url}?fm=webp`;
    }
    if (url.includes("cloudinary.com")) {
        return url.replace("/upload/", "/upload/f_webp/");
    }

    return url;
}

export function HeroMedia({ type, url, alt, images, lazy = true }: HeroMediaProps) {
    const isVideoExtension = url.match(/\.(mp4|webm|ogg)$/i);
    const isImageExtension = url.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i);

    // Auto-correct type if possible, or fallback to user selection
    const effectiveType = isVideoExtension ? "video" : (isImageExtension ? "image" : type);

    // Parallax Effect
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 500], [0, 200]);

    // Lazy loading state
    const [isLoaded, setIsLoaded] = useState(!lazy);
    const [hasError, setHasError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Internal image carousel state (if multiple images provided)
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const imageUrls = images && images.length > 0 ? images : [url];

    // Auto-advance internal image carousel
    useEffect(() => {
        if (imageUrls.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length);
        }, 4000); // 4 seconds per image

        return () => clearInterval(timer);
    }, [imageUrls.length]);

    // Intersection Observer for lazy loading
    useEffect(() => {
        if (!lazy || isLoaded) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsLoaded(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "200px" } // Start loading 200px before visible
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [lazy, isLoaded]);

    // Handle media load error - fallback to placeholder
    const handleError = () => {
        setHasError(true);
        console.warn(`[HeroMedia] Failed to load: ${url}`);
    };

    // Fallback placeholder
    if (hasError) {
        return (
            <div className="absolute inset-0 w-full h-full overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="absolute inset-0 flex items-center justify-center text-white/30">
                    <span className="text-lg">Media unavailable</span>
                </div>
            </div>
        );
    }

    // Loading placeholder
    if (lazy && !isLoaded) {
        return (
            <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse" />
            </div>
        );
    }

    if (effectiveType === "video") {
        return (
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                <motion.div style={{ y }} className="w-full h-full">
                    <video
                        autoPlay
                        muted // Always muted per user request
                        loop
                        playsInline
                        className="w-full h-[120%] -mt-[10%] object-cover"
                        poster={url}
                        onError={handleError}
                    >
                        <source src={url} type="video/mp4" />
                        <source src={url} type="video/webm" />
                        Your browser does not support the video tag.
                    </video>
                </motion.div>
                <div className="absolute inset-0 bg-black/20 pointer-events-none" />
            </div>
        );
    }

    // Image with optional internal carousel
    const currentUrl = getOptimizedUrl(imageUrls[currentImageIndex]);

    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
            <motion.img
                key={currentImageIndex}
                style={{ y }}
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                src={currentUrl}
                alt={alt || "Hero Background"}
                className="w-full h-[120%] -mt-[10%] object-cover"
                loading={lazy ? "lazy" : "eager"}
                onError={handleError}
            />

            {/* Internal image carousel indicators */}
            {imageUrls.length > 1 && (
                <div className="absolute bottom-16 left-0 right-0 z-20 flex justify-center gap-1.5">
                    {imageUrls.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                                }`}
                            aria-label={`Image ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
