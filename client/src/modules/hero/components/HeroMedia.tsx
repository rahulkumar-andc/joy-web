import { motion } from "framer-motion";

interface HeroMediaProps {
    type: "image" | "video";
    url: string;
    alt?: string;
}

export function HeroMedia({ type, url, alt }: HeroMediaProps) {
    if (type === "video") {
        return (
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                >
                    <source src={url} type="video/mp4" />
                    {/* Fallback for browsers that don't support video */}
                    Your browser does not support the video tag.
                </video>
                {/* Optional: Add an image fallback overlay if video fails to load, handled via error events if needed */}
            </div>
        );
    }

    return (
        <div className="absolute inset-0 w-full h-full">
            <motion.img
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8 }}
                src={url}
                alt={alt || "Hero Background"}
                className="w-full h-full object-cover"
            />
        </div>
    );
}
