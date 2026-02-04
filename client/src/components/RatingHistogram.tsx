import { Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface RatingHistogramProps {
    totalRatings: number;
    avgRating: number;
    distribution?: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
    };
}

export function RatingHistogram({ totalRatings, avgRating, distribution }: RatingHistogramProps) {
    // Mock distribution if not provided
    const dist = distribution || {
        5: Math.round(totalRatings * 0.6),
        4: Math.round(totalRatings * 0.2),
        3: Math.round(totalRatings * 0.1),
        2: Math.round(totalRatings * 0.05),
        1: Math.round(totalRatings * 0.05),
    };

    const getPercentage = (count: number) => (totalRatings > 0 ? (count / totalRatings) * 100 : 0);

    return (
        <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Left: Big Rating Circle */}
            <div className="flex flex-col items-center justify-center min-w-[120px]">
                <div className="text-[32px] font-bold text-gray-900 flex items-center gap-1">
                    {avgRating.toFixed(1)} <Star className="w-6 h-6 fill-gray-900" />
                </div>
                <p className="text-gray-500 text-sm mt-1">{totalRatings.toLocaleString()} Ratings &</p>
                <p className="text-gray-500 text-sm">Review Count Reviews</p> {/* Placeholder for review count */}
            </div>

            {/* Right: Histogram Bars */}
            <div className="flex-1 w-full space-y-2">
                {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-4 text-sm">
                        <div className="w-8 font-medium flex items-center gap-1">
                            {star} <Star className="w-3 h-3" />
                        </div>
                        <Progress
                            value={getPercentage(dist[star as keyof typeof dist])}
                            className="h-1.5 bg-gray-200"
                            indicatorClassName={
                                star >= 4 ? "bg-green-600" :
                                    star === 3 ? "bg-yellow-500" :
                                        star === 2 ? "bg-orange-500" : "bg-red-500"
                            }
                        />
                        <div className="w-10 text-gray-500 text-xs text-right">
                            {dist[star as keyof typeof dist].toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
