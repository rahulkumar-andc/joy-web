export function ProductSkeleton() {
    return (
        <div className="group animate-pulse">
            {/* Image skeleton */}
            <div className="aspect-[3/4] rounded-2xl skeleton mb-4" />

            {/* Content skeleton */}
            <div className="space-y-3">
                {/* Brand */}
                <div className="h-3 w-16 rounded skeleton" />

                {/* Title */}
                <div className="h-5 w-3/4 rounded skeleton" />

                {/* Price */}
                <div className="h-5 w-20 rounded skeleton" />
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
