import { Link } from "wouter";
import { type Product } from "@shared/schema";
import { ShoppingBag, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddToCart } from "@/hooks/use-cart";
import { motion } from "framer-motion";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const addToCartMutation = useAddToCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    addToCartMutation.mutate({ productId: product.id, quantity: 1 });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
    >
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        {product.discountPrice && (
          <span className="bg-destructive text-white text-[10px] font-bold px-2 py-1 rounded-sm tracking-wider uppercase">
            Sale
          </span>
        )}
        {product.isNewArrival && (
          <span className="bg-accent text-white text-[10px] font-bold px-2 py-1 rounded-sm tracking-wider uppercase">
            New
          </span>
        )}
      </div>

      {/* Image Container */}
      <Link href={`/product/${product.id}`} className="block relative aspect-[3/4] overflow-hidden bg-gray-100">
        <img 
          src={product.images[0]} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Hover Overlay Actions */}
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex gap-2 justify-center">
            <Button 
              size="sm" 
              className="bg-white text-primary hover:bg-accent hover:text-white transition-colors w-full"
              onClick={handleAddToCart}
              disabled={addToCartMutation.isPending}
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              {addToCartMutation.isPending ? "Adding..." : "Add to Cart"}
            </Button>
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="p-4">
        <div className="text-xs text-muted-foreground mb-1 font-medium">{product.brand || "LuxeMode"}</div>
        <Link href={`/product/${product.id}`}>
          <h3 className="font-display text-lg leading-tight mb-2 hover:text-accent transition-colors truncate">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary">₹{product.price}</span>
          {product.discountPrice && (
            <span className="text-sm text-muted-foreground line-through">₹{product.discountPrice}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
