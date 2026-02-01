import { useRecentlyViewedProducts } from "@/hooks/use-recently-viewed";
import { Link } from "wouter";
import { Clock, ChevronRight } from "lucide-react";

export function RecentlyViewed({ excludeId }: { excludeId?: number }) {
    const { products, hasRecent } = useRecentlyViewedProducts();

    // Filter out current product and limit
    const filteredProducts = products
        .filter((p) => p && p.id !== excludeId)
        .slice(0, 6);

    if (!hasRecent || filteredProducts.length === 0) {
        return null;
    }

    return (
        <section className="mt-16 border-t border-border pt-12">
            <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold text-primary flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recently Viewed
                </h2>
                <Link href="/shop" className="text-sm text-accent hover:underline flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredProducts.map((product) => (
                    <Link
                        key={product!.id}
                        href={`/product/${product!.id}`}
                        className="group"
                    >
                        <div className="aspect-[3/4] bg-white rounded-lg overflow-hidden shadow-sm mb-2">
                            <img
                                src={product!.images[0]}
                                alt={product!.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        </div>
                        <h3 className="text-sm font-medium truncate group-hover:text-accent transition-colors">
                            {product!.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">₹{product!.price}</p>
                    </Link>
                ))}
            </div>
        </section>
    );
}
