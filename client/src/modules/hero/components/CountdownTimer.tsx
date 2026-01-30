import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface CountdownTimerProps {
    targetDate: string | Date; // ISO string or Date object
    className?: string;
    textColor?: string;
}

export function CountdownTimer({ targetDate, className, textColor = "#ffffff" }: CountdownTimerProps) {
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();

        if (difference <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        return {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60),
        };
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    // Prevent hydration mismatch
    if (!isClient) return null;

    // Don't render if expired
    if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
        return null;
    }

    const TimeUnit = ({ value, label }: { value: number; label: string }) => (
        <div
            className="flex flex-col items-center justify-center p-2 sm:p-3 bg-white/10 backdrop-blur-md rounded-lg min-w-[70px] sm:min-w-[80px]"
            style={{ borderColor: textColor }}
        >
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tighter" style={{ color: textColor }}>
                {value.toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs uppercase tracking-wider opacity-80" style={{ color: textColor }}>
                {label}
            </span>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 sm:gap-4 mb-6 ${className}`}
        >
            {timeLeft.days > 0 && <TimeUnit value={timeLeft.days} label="Days" />}
            <TimeUnit value={timeLeft.hours} label="Hours" />
            <TimeUnit value={timeLeft.minutes} label="Mins" />
            <TimeUnit value={timeLeft.seconds} label="Secs" />
        </motion.div>
    );
}
