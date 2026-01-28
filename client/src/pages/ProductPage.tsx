import { useState } from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/Layout";
import { useProduct } from "@/hooks/use-products";
import { useAddToCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Minus, Plus, Heart } from "lucide-react";

export default function ProductPage() {
  const [match, params] = useRoute("/product/:id");
  const id = parseInt(params?.id || "0");
  const { data: product, isLoading, isError } = useProduct(id);
  const addToCart = useAddToCart();

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");

  if (isLoading) return <ProductSkeleton />;
  if (isError || !product) return <div className="p-20 text-center">Product not found</div>;

  const handleAddToCart = () => {
    addToCart.mutate({
      productId: product.id,
      quantity,
      size: selectedSize,
      color: selectedColor,
    });
  };

  const images = product.images?.length > 0 ? product.images : [
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop"
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Gallery - In a real app, this would be a proper gallery/carousel */}
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-secondary overflow-hidden">
              <img 
                src={images[0]} 
                alt={product.name} 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {images.slice(1, 3).map((img, idx) => (
                <div key={idx} className="aspect-[3/4] bg-secondary">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="sticky top-24 self-start space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {product.isNewArrival && <Badge variant="secondary" className="rounded-none uppercase text-[10px] tracking-widest">New Arrival</Badge>}
                {product.brand && <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{product.brand}</span>}
              </div>
              
              <h1 className="font-display text-4xl lg:text-5xl">{product.name}</h1>
              
              <div className="text-2xl font-medium">
                ${product.price}
              </div>
              
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>

            <div className="space-y-6 pt-6 border-t">
              {/* Color Selection */}
              {product.colors && product.colors.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-wide font-bold">Color: {selectedColor}</Label>
                  <RadioGroup value={selectedColor} onValueChange={setSelectedColor} className="flex gap-3">
                    {product.colors.map((color) => (
                      <div key={color} className="flex items-center space-x-2">
                        <RadioGroupItem value={color} id={`color-${color}`} className="peer sr-only" />
                        <Label
                          htmlFor={`color-${color}`}
                          className={`h-8 px-4 flex items-center justify-center border cursor-pointer hover:bg-secondary transition-colors ${
                            selectedColor === color ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90" : "border-input"
                          }`}
                        >
                          {color}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Size Selection */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label className="text-xs uppercase tracking-wide font-bold">Size: {selectedSize}</Label>
                    <button className="text-xs underline text-muted-foreground">Size Guide</button>
                  </div>
                  <RadioGroup value={selectedSize} onValueChange={setSelectedSize} className="flex flex-wrap gap-3">
                    {product.sizes.map((size) => (
                      <div key={size} className="flex items-center space-x-2">
                        <RadioGroupItem value={size} id={`size-${size}`} className="peer sr-only" />
                        <Label
                          htmlFor={`size-${size}`}
                          className={`h-10 min-w-[3rem] px-3 flex items-center justify-center border cursor-pointer hover:bg-secondary transition-colors ${
                            selectedSize === size ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90" : "border-input"
                          }`}
                        >
                          {size}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wide font-bold">Quantity</Label>
                <div className="flex items-center border w-fit">
                  <button 
                    className="p-3 hover:bg-secondary transition-colors"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button 
                    className="p-3 hover:bg-secondary transition-colors"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button 
                size="lg" 
                className="flex-1 rounded-none h-14 uppercase tracking-widest text-base"
                onClick={handleAddToCart}
                disabled={addToCart.isPending}
              >
                {addToCart.isPending ? "Adding..." : "Add to Cart"}
              </Button>
              <Button size="icon" variant="outline" className="h-14 w-14 rounded-none border-input">
                <Heart className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="pt-6 border-t text-sm text-muted-foreground space-y-2">
              <p>Free standard shipping on orders over $150</p>
              <p>Returns accepted within 30 days</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ProductSkeleton() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Skeleton className="aspect-[3/4] w-full" />
          <div className="space-y-8">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      </div>
    </Layout>
  );
}
