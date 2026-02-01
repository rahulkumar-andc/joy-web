
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ProductSkeleton() {
    return (
        <div className="space-y-4 rounded-xl overflow-hidden">
            <div className="aspect-[3/4] relative">
                <Skeleton className="h-full w-full" />
            </div>
            <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-1/4" />
            </div>
        </div>
    );
}

export function ProductSkeletonGrid({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {Array.from({ length: count }).map((_, i) => (
                <ProductSkeleton key={i} />
            ))}
        </div>
    );
}
