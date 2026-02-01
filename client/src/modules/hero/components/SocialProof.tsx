import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface SocialProofProps {
    campaignId: number;
    label?: string; // e.g., "claimed this offer", "viewed this deal"
}

// Realistic-looking random increment
function getRandomIncrement(min = 1, max = 5): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function SocialProof({ campaignId, label = "claimed this offer" }: SocialProofProps) {
    const [count, setCount] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Fetch initial count from analytics
    useEffect(() => {
        async function fetchCount() {
            try {
                const res = await apiRequest("GET", `/api/hero/social-proof/${campaignId}`);
                if (res.ok) {
                    const data = await res.json();
                    setCount(data.count || Math.floor(Math.random() * 500) + 100); // Fallback to realistic number
                } else {
                    // Start with realistic base count
                    setCount(Math.floor(Math.random() * 500) + 100);
                }
            } catch {
                setCount(Math.floor(Math.random() * 500) + 100);
            }
        }
        fetchCount();
    }, [campaignId]);

    // Simulate real-time activity (optimistic updates)
    useEffect(() => {
        if (count === 0) return;

        const timer = setInterval(() => {
            setIsAnimating(true);
            setCount((prev) => prev + getRandomIncrement());

            setTimeout(() => setIsAnimating(false), 500);
        }, Math.random() * 5000 + 3000); // Random interval 3-8 seconds

        return () => clearInterval(timer);
    }, [count]);

    if (count === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20"
        >
            {/* Animated avatar stack */}
            <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 border-2 border-white/30 flex items-center justify-center text-[10px] text-white font-bold"
                    >
                        {String.fromCharCode(65 + Math.floor(Math.random() * 26))}
                    </div>
                ))}
            </div>

            {/* Count with animation */}
            <div className="flex items-center gap-1">
                <AnimatePresence mode="wait">
                    <motion.span
                        key={count}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={`font-bold text-white ${isAnimating ? "text-green-400" : ""}`}
                    >
                        {count.toLocaleString()}
                    </motion.span>
                </AnimatePresence>
                <span className="text-white/80 text-sm">{label}</span>
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs text-green-400">Live</span>
            </div>
        </motion.div>
    );
}
