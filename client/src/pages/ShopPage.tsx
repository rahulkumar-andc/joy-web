import { useInfiniteProducts, useCategories } from "@/hooks/use-products";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { ProductSkeletonGrid } from "@/components/ProductSkeleton";
import { QuickViewModal } from "@/components/QuickViewModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useLocation } from "wouter";
import { Filter, ChevronDown, X, Star, SlidersHorizontal, Loader2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { type Product } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SEO } from "@/components/SEO";

export default function ShopPage() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const categoryParam = searchParams.get("category") || undefined;
  const sortParam = searchParams.get("sort") || undefined;
  const searchParam = searchParams.get("search") || undefined;

  // Dynamic max price
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [maxPriceLimit, setMaxPriceLimit] = useState(500000);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categoryParam ? [categoryParam] : []);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [priceFilterActive, setPriceFilterActive] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Infinite Query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteProducts({
    category: categoryParam,
    sort: sortParam,
    search: searchParam
  });

  const products = data?.pages.flatMap(page => page?.products || []) || [];

  const { data: categories } = useCategories();

  // Intersection Observer for Infinite Scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasNextPage, fetchNextPage]);

  // Calculate max price from products dynamically
  useEffect(() => {
    if (products && products.length > 0) {
      const maxProductPrice = Math.max(...products.map(p => parseFloat(p.price)));
      const newMaxLimit = Math.ceil(maxProductPrice / 1000) * 1000 + 1000; // Round up to nearest 1000
      setMaxPriceLimit(newMaxLimit);
      // Only update price range if filter not actively used
      if (!priceFilterActive) {
        setPriceRange([0, newMaxLimit]);
      }
    }
  }, [products, priceFilterActive]);

  // Filter products by price only if price filter is actively used
  // Note with pagination: client-side filtering works only on loaded products. 
  // Ideally price filtering should be server-side too, but for now we follow existing logic on loaded items.
  const filteredProducts = priceFilterActive
    ? products.filter(product => {
      const price = parseFloat(product.price);
      return price >= priceRange[0] && price <= priceRange[1];
    })
    : products;

  const handleSort = (sort: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("sort", sort);
    setLocation(`/shop?${params.toString()}`);
  };

  const handleCategory = (cat: string) => {
    const params = new URLSearchParams(window.location.search);
    if (cat === "all") {
      params.delete("category");
      setSelectedCategories([]);
    } else {
      params.set("category", cat);
      setSelectedCategories([cat]);
    }
    setLocation(`/shop?${params.toString()}`);
  };

  const handleCategoryToggle = (slug: string) => {
    const newSelected = selectedCategories.includes(slug)
      ? selectedCategories.filter(c => c !== slug)
      : [...selectedCategories, slug];

    setSelectedCategories(newSelected);

    const params = new URLSearchParams(window.location.search);
    if (newSelected.length === 0) {
      params.delete("category");
    } else {
      params.set("category", newSelected[0]); // Use first selected for now
    }
    setLocation(`/shop?${params.toString()}`);
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, maxPriceLimit]);
    setPriceFilterActive(false);
    setLocation("/shop");
  };

  const activeFilterCount = (selectedCategories.length > 0 ? 1 : 0) +
    (priceFilterActive ? 1 : 0);

  // Filter Sidebar Component
  const FilterSidebar = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`${isMobile ? "" : "sticky top-24"} space-y-1`}>
      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="bg-white rounded-xl p-4 border border-border/50 shadow-sm mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-sm">Active Filters</h3>
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-accent h-auto p-0">
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map(cat => (
              <span key={cat} className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs px-2 py-1 rounded-full">
                {cat}
                <X className="w-3 h-3 cursor-pointer" onClick={() => handleCategoryToggle(cat)} />
              </span>
            ))}
            {(priceRange[0] > 0 || priceRange[1] < 10000) && (
              <span className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs px-2 py-1 rounded-full">
                ₹{priceRange[0]} - ₹{priceRange[1]}
                <X className="w-3 h-3 cursor-pointer" onClick={() => { setPriceRange([0, maxPriceLimit]); setPriceFilterActive(false); }} />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filters Card */}
      <div className="bg-white rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <Accordion type="multiple" defaultValue={["category", "price", "rating"]} className="w-full">

          {/* Category Filter */}
          <AccordionItem value="category" className="border-b border-border/50">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
              <span className="font-semibold text-sm">Category</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-3">
                {categories?.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-3 cursor-pointer group">
                    <Checkbox
                      checked={selectedCategories.includes(cat.slug)}
                      onCheckedChange={() => handleCategoryToggle(cat.slug)}
                      className="rounded"
                    />
                    <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Price Filter */}
          <AccordionItem value="price" className="border-b border-border/50">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
              <span className="font-semibold text-sm">Price</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                {/* Price Range Slider */}
                <Slider
                  value={priceRange}
                  onValueChange={(value) => { setPriceRange(value as [number, number]); setPriceFilterActive(true); }}
                  min={0}
                  max={maxPriceLimit}
                  step={1000}
                  className="mt-2"
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Min</label>
                    <Input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) => { setPriceRange([parseInt(e.target.value) || 0, priceRange[1]]); setPriceFilterActive(true); }}
                      className="h-9 text-sm"
                      placeholder="₹0"
                    />
                  </div>
                  <span className="text-muted-foreground mt-5">-</span>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Max</label>
                    <Input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => { setPriceRange([priceRange[0], parseInt(e.target.value) || maxPriceLimit]); setPriceFilterActive(true); }}
                      className="h-9 text-sm"
                      placeholder={`₹${maxPriceLimit}`}
                    />
                  </div>
                </div>

                {/* Quick Price Options */}
                <div className="space-y-2">
                  {[
                    { label: "Under ₹500", min: 0, max: 500 },
                    { label: "₹500 - ₹2000", min: 500, max: 2000 },
                    { label: "₹2000 - ₹10000", min: 2000, max: 10000 },
                    { label: "₹10000 - ₹50000", min: 10000, max: 50000 },
                    { label: "Above ₹50000", min: 50000, max: maxPriceLimit },
                  ].map((option) => (
                    <label key={option.label} className="flex items-center gap-3 cursor-pointer group">
                      <Checkbox
                        checked={priceFilterActive && priceRange[0] === option.min && priceRange[1] === option.max}
                        onCheckedChange={() => { setPriceRange([option.min, option.max]); setPriceFilterActive(true); }}
                        className="rounded"
                      />
                      <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Customer Rating Filter */}
          <AccordionItem value="rating" className="border-b-0">
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
              <span className="font-semibold text-sm">Customer Rating</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-3">
                {[4, 3, 2, 1].map((rating) => (
                  <label key={rating} className="flex items-center gap-3 cursor-pointer group">
                    <Checkbox className="rounded" />
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                        />
                      ))}
                      <span className="text-sm text-muted-foreground ml-1">& Up</span>
                    </div>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-body">
      <SEO title="Shop All Products" description="Browse our extensive collection of premium products." />
      <Navbar />

      {/* Header */}
      <div className="bg-warm-beige py-8 md:py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mb-2">
            {searchParam
              ? `Search Results for "${searchParam}"`
              : categoryParam
                ? `${categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1)}'s Collection`
                : "All Products"}
          </h1>
          <p className="text-muted-foreground">
            {data?.pages[0]?.total || 0} products found
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <FilterSidebar />
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              {/* Mobile Filter Button */}
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="bg-accent text-white text-xs px-1.5 py-0.5 rounded-full">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterSidebar isMobile />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Category Pills - Desktop */}
              <div className="hidden sm:flex items-center gap-2 overflow-x-auto flex-1 pb-2 hide-scrollbar">
                <Button
                  variant={!categoryParam ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCategory("all")}
                  className="rounded-full whitespace-nowrap"
                >
                  All
                </Button>
                {categories?.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={categoryParam === cat.slug ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCategory(cat.slug)}
                    className="rounded-full capitalize whitespace-nowrap"
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-[180px] justify-between">
                    {sortParam === "price_asc" ? "Price: Low to High" :
                      sortParam === "price_desc" ? "Price: High to Low" :
                        sortParam === "newest" ? "Newest First" : "Sort By"}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSort("newest")}>Newest Arrivals</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("price_asc")}>Price: Low to High</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("price_desc")}>Price: High to Low</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSort("popularity")}>Popularity</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Product Grid */}
            {isLoading ? (
              <ProductSkeletonGrid count={6} />
            ) : filteredProducts && filteredProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onQuickView={setQuickViewProduct}
                    />
                  ))}
                </div>

                {/* Infinite Scroll Loader */}
                <div ref={observerTarget} className="py-8 flex justify-center w-full">
                  {isFetchingNextPage && <Loader2 className="w-8 h-8 animate-spin text-accent" />}
                  {!hasNextPage && products.length > 0 && <span className="text-muted-foreground text-sm">No more products to load</span>}
                </div>
              </>
            ) : (
              <div className="text-center py-20 bg-white rounded-xl border border-border/50">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Filter className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-medium text-muted-foreground mb-2">No products found</h3>
                <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters or search terms</p>
                <Button variant="outline" onClick={clearAllFilters}>Clear All Filters</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        open={!!quickViewProduct}
        onOpenChange={(open) => !open && setQuickViewProduct(null)}
      />
    </div>
  );
}
