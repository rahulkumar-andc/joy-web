import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/ProductCard";
import { ProductSkeletonGrid } from "@/components/ProductSkeleton";
import { type Product } from "@shared/schema";
import { motion } from "framer-motion";

interface RelatedProductsProps {
    currentProductId: number;
    category: string;
}

export function RelatedProducts({ currentProductId, category }: RelatedProductsProps) {
    // Fetch products from the same category
    const { data: products, isLoading } = useProducts({
        category: category,
    });

    // Filter out the current product and limit to 4 items
    // Randomize the selection to make it feel more dynamic if we have many
    const relatedProducts = products
        ? products
            .filter((p) => p.id !== currentProductId)
            .sort(() => 0.5 - Math.random()) // Simple shuffle
            .slice(0, 4)
        : [];

    if (isLoading) {
        return (
            <div className="mt-16">
                <h2 className="text-2xl font-display font-bold mb-8">You Might Also Like</h2>
                <ProductSkeletonGrid count={4} />
            </div>
        );
    }

    if (relatedProducts.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-16 border-t border-border pt-16"
        >
            <h2 className="text-2xl font-display font-bold mb-8">You Might Also Like</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </motion.div>
    );
}
