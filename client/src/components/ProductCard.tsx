import { Link } from "wouter";
import { Product } from "@shared/schema";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { useAddToCart } from "@/hooks/use-cart";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const addToCart = useAddToCart();

  // Use the first image or a placeholder
  const imageUrl = product.images?.[0] || 
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
        {/* Main Image */}
        <Link href={`/product/${product.id}`} className="block h-full w-full cursor-pointer">
          <img
            src={imageUrl}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </Link>
        
        {/* Quick Add Button */}
        <div className="absolute bottom-4 right-4 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Button 
            size="icon" 
            className="h-10 w-10 rounded-full shadow-lg"
            onClick={() => addToCart.mutate({ productId: product.id, quantity: 1 })}
            disabled={addToCart.isPending}
          >
            <ShoppingBag className="h-4 w-4" />
          </Button>
        </div>

        {/* Badges */}
        {product.isNewArrival && (
          <span className="absolute left-2 top-2 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
            New
          </span>
        )}
        {Number(product.discountPrice) > 0 && (
          <span className="absolute right-2 top-2 bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Sale
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1">
        <h3 className="text-sm font-medium text-primary">
          <Link href={`/product/${product.id}`} className="hover:underline decoration-1 underline-offset-4">
            {product.name}
          </Link>
        </h3>
        <div className="flex items-center gap-2 text-sm">
          {product.discountPrice ? (
            <>
              <span className="font-semibold text-red-600">${product.discountPrice}</span>
              <span className="text-muted-foreground line-through">${product.price}</span>
            </>
          ) : (
            <span className="font-semibold text-primary">${product.price}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
