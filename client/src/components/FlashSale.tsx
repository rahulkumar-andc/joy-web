import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Timer } from "lucide-react";

interface FlashSaleProps {
    endTime?: string | Date | null;
}

export function FlashSale({ endTime }: FlashSaleProps) {
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({ hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        if (!endTime) return;

        const targetDate = new Date(endTime).getTime();

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                clearInterval(interval);
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft({ hours, minutes, seconds });
        }, 1000);

        return () => clearInterval(interval);
    }, [endTime]);

    if (!endTime) return null;

    return (
        <div className="bg-primary text-primary-foreground py-12">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-4 text-accent">
                        <Timer className="w-6 h-6 animate-pulse" />
                        <span className="font-bold tracking-wider uppercase">Deal of the Day</span>
                    </div>
                    <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
                        Flash Sale Ending Soon
                    </h2>
                    <p className="text-primary-foreground/80 text-lg max-w-xl">
                        Grab your favorites before time runs out. Exclusive discounts on selected premium items.
                    </p>
                </div>

                <div className="flex gap-4">
                    <TimeBlock value={timeLeft.hours} label="Hours" />
                    <TimeBlock value={timeLeft.minutes} label="Mins" />
                    <TimeBlock value={timeLeft.seconds} label="Secs" />
                </div>

                <div>
                    <Link href="/shop">
                        <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold px-8 py-6 rounded-full">
                            Shop The Sale
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-lg p-4 min-w-[90px] border border-white/20">
            <span className="text-4xl font-bold font-display tabular-nums">
                {value.toString().padStart(2, '0')}
            </span>
            <span className="text-xs uppercase tracking-wider opacity-80 mt-1">{label}</span>
        </div>
    );
}
