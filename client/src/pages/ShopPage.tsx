import { useProducts, useCategories } from "@/hooks/use-products";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Filter, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ShopPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const categoryParam = searchParams.get("category") || undefined;
  const sortParam = searchParams.get("sort") || undefined;
  const searchParam = searchParams.get("search") || undefined;

  const { data: products, isLoading } = useProducts({ 
    category: categoryParam, 
    sort: sortParam,
    search: searchParam 
  });
  
  const { data: categories } = useCategories();

  const handleSort = (sort: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("sort", sort);
    setLocation(`/shop?${params.toString()}`);
  };

  const handleCategory = (cat: string) => {
    const params = new URLSearchParams(window.location.search);
    if (cat === "all") params.delete("category");
    else params.set("category", cat);
    setLocation(`/shop?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background font-body">
      <Navbar />

      {/* Header */}
      <div className="bg-warm-beige py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl font-bold text-primary mb-2">
            {categoryParam ? `${categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1)}'s Collection` : "All Products"}
          </h1>
          <p className="text-muted-foreground">Discover our latest arrivals and timeless classics.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 sticky top-20 bg-background/95 backdrop-blur-sm z-30 p-4 border border-border/50 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            <Button 
              variant={!categoryParam ? "default" : "outline"} 
              size="sm"
              onClick={() => handleCategory("all")}
              className="rounded-full"
            >
              All
            </Button>
            {categories?.map((cat) => (
              <Button 
                key={cat.id}
                variant={categoryParam === cat.slug ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategory(cat.slug)}
                className="rounded-full capitalize"
              >
                {cat.name}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto w-[180px] justify-between">
                  Sort By <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSort("newest")}>Newest Arrivals</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("price_asc")}>Price: Low to High</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSort("price_desc")}>Price: High to Low</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Product Grid */}
        {isLoading ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
             {[...Array(8)].map((_, i) => (
               <div key={i} className="bg-white rounded-xl h-[400px] animate-pulse"></div>
             ))}
           </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <h3 className="text-xl font-medium text-muted-foreground">No products found.</h3>
            <Button variant="link" onClick={() => setLocation("/shop")}>Clear filters</Button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
