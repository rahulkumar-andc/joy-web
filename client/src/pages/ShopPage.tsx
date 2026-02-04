import { useInfiniteProducts, useCategories } from "@/hooks/use-products";
import { PremiumHeader, PremiumFooter } from "@/components/layout";
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
      const price = parseFloat(product.mrp);
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

  // Shared Filter Component
  const FilterSidebar = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="bg-white h-full">
      {!isMobile && (
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Filters</h2>
            {activeFilterCount > 0 && (
              <Button variant="ghost" className="text-xs text-flipkart-blue h-auto p-0 hover:bg-transparent font-medium" onClick={clearAllFilters}>CLEAR ALL</Button>
            )}
          </div>
        </div>
      )}

      <div className="divide-y">
        {/* Categories */}
        <div className="p-4">
          <div className="text-[13px] font-medium text-gray-500 mb-2 uppercase tracking-wide">CATEGORIES</div>
          <div className="space-y-2 pl-2">
            <div
              className={`text-[14px] cursor-pointer ${!categoryParam ? "font-bold text-gray-900" : "text-gray-600"}`}
              onClick={() => handleCategory("all")}
            >
              All Categories
            </div>
            {categories?.map((cat) => (
              <div
                key={cat.id}
                className={`text-[14px] cursor-pointer hover:text-flipkart-blue ${categoryParam === cat.slug ? "font-bold text-gray-900" : "text-left text-gray-600"}`}
                onClick={() => handleCategory(cat.slug)}
              >
                {cat.name}
              </div>
            ))}
          </div>
        </div>

        {/* Price */}
        <div className="p-4">
          <div className="text-[13px] font-medium text-gray-500 mb-2 uppercase tracking-wide">PRICE</div>
          <Slider
            value={priceRange}
            onValueChange={(value) => { setPriceRange(value as [number, number]); setPriceFilterActive(true); }}
            min={0}
            max={maxPriceLimit}
            step={500}
            className="mt-4 mb-4"
          />
          <div className="flex justify-between gap-2">
            <div className="bg-white border rounded px-2 py-1 text-[14px]">₹{priceRange[0]}</div>
            <div className="text-gray-400">to</div>
            <div className="bg-white border rounded px-2 py-1 text-[14px]">₹{priceRange[1]}</div>
          </div>
        </div>

        {/* Customer Ratings */}
        <div className="p-4">
          <div className="text-[13px] font-medium text-gray-500 mb-2 uppercase tracking-wide">CUSTOMER RATINGS</div>
          <div className="space-y-2">
            {[4, 3, 2, 1].map((rating) => (
              <label key={rating} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  className="rounded-sm border-gray-400 w-4 h-4"
                  checked={false} // Todo: Implement rating filter state
                  onCheckedChange={() => { }}
                />
                <div className="flex items-center gap-1 text-[14px]">
                  {rating}<Star className="w-3 h-3 fill-gray-800 text-gray-800" /> & above
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Helper helper to check if a sort option is active
  const isSortActive = (option: string) => {
    if (!sortParam && option === "popularity") return true; // Default
    return sortParam === option;
  };

  return (
    <div className="min-h-screen bg-flipkart-bg font-body">
      <SEO title="Shop Online" description="Shop for premium products at best prices." />
      <PremiumHeader />

      <div className="container mx-auto px-2 lg:px-3 py-3">
        <div className="flex gap-3">

          {/* Left Sidebar - Filters - Desktop */}
          <aside className="hidden lg:block w-[280px] flex-shrink-0 bg-white shadow-sm self-start min-h-[80vh]">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Filters</h2>
                {(activeFilterCount > 0) && (
                  <Button variant="ghost" className="text-xs text-flipkart-blue h-auto p-0 hover:bg-transparent font-medium" onClick={clearAllFilters}>CLEAR ALL</Button>
                )}
              </div>
              {/* Active Filter Pills would go here if needed, but Flipkart usually just clears */}
            </div>

            {/* Filter Sections */}
            <div className="divide-y">
              {/* Categories */}
              <div className="p-4">
                <div className="text-[13px] font-medium text-gray-500 mb-2 uppercase tracking-wide">CATEGORIES</div>
                <div className="space-y-2 pl-2">
                  <div
                    className={`text-[14px] cursor-pointer ${!categoryParam ? "font-bold text-gray-900" : "text-gray-600"}`}
                    onClick={() => handleCategory("all")}
                  >
                    All Categories
                  </div>
                  {categories?.map((cat) => (
                    <div
                      key={cat.id}
                      className={`text-[14px] cursor-pointer hover:text-flipkart-blue ${categoryParam === cat.slug ? "font-bold text-gray-900" : "text-left text-gray-600"}`}
                      onClick={() => handleCategory(cat.slug)}
                    >
                      {cat.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Price - Simplified Range for now */}
              <div className="p-4">
                <div className="text-[13px] font-medium text-gray-500 mb-2 uppercase tracking-wide">PRICE</div>
                <Slider
                  value={priceRange}
                  onValueChange={(value) => { setPriceRange(value as [number, number]); setPriceFilterActive(true); }}
                  min={0}
                  max={maxPriceLimit}
                  step={500}
                  className="mt-4 mb-4"
                />
                <div className="flex justify-between gap-2">
                  <div className="bg-white border rounded px-2 py-1 text-[14px]">₹{priceRange[0]}</div>
                  <div className="text-gray-400">to</div>
                  <div className="bg-white border rounded px-2 py-1 text-[14px]">₹{priceRange[1]}</div>
                </div>
              </div>

              {/* Customer Ratings */}
              <div className="p-4">
                <div className="text-[13px] font-medium text-gray-500 mb-2 uppercase tracking-wide">CUSTOMER RATINGS</div>
                <div className="space-y-2">
                  {[4, 3, 2, 1].map((rating) => (
                    <label key={rating} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox className="rounded-sm border-gray-400 w-4 h-4" />
                      <div className="flex items-center gap-1 text-[14px]">
                        {rating}<Star className="w-3 h-3 fill-gray-800 text-gray-800" /> & above
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Sort Bar */}
            <div className="bg-white p-3 shadow-sm mb-3 flex items-center gap-4 overflow-x-auto hide-scrollbar">
              <span className="font-medium text-[14px] whitespace-nowrap">Sort By</span>
              <button
                onClick={() => handleSort("popularity")}
                className={`text-[14px] whitespace-nowrap pb-1 border-b-2 ${isSortActive("popularity") ? "text-flipkart-blue border-flipkart-blue font-medium" : "text-gray-600 border-transparent"}`}
              >
                Popularity
              </button>
              <button
                onClick={() => handleSort("price_asc")}
                className={`text-[14px] whitespace-nowrap pb-1 border-b-2 ${isSortActive("price_asc") ? "text-flipkart-blue border-flipkart-blue font-medium" : "text-gray-600 border-transparent"}`}
              >
                Price -- Low to High
              </button>
              <button
                onClick={() => handleSort("price_desc")}
                className={`text-[14px] whitespace-nowrap pb-1 border-b-2 ${isSortActive("price_desc") ? "text-flipkart-blue border-flipkart-blue font-medium" : "text-gray-600 border-transparent"}`}
              >
                Price -- High to Low
              </button>
              <button
                onClick={() => handleSort("newest")}
                className={`text-[14px] whitespace-nowrap pb-1 border-b-2 ${isSortActive("newest") ? "text-flipkart-blue border-flipkart-blue font-medium" : "text-gray-600 border-transparent"}`}
              >
                Newest First
              </button>

              {/* Mobile Filter Trigger */}
              <div className="ml-auto lg:hidden">
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <Filter className="w-4 h-4" /> Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[80vh]">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 h-full overflow-y-auto pb-20">
                      <FilterSidebar isMobile />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Products Grid */}
            <div className="bg-white p-3 shadow-sm min-h-[500px]">
              <div className="mb-4">
                <h1 className="text-lg font-medium">
                  {categoryParam
                    ? `${categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1)}`
                    : "Clothing And Accessories"}
                  <span className="text-gray-500 text-sm font-normal ml-2">
                    (Showing 1-{filteredProducts?.length || 0} products of {data?.pages[0]?.total || 0} products)
                  </span>
                </h1>
              </div>

              {isLoading ? (
                <ProductSkeletonGrid count={8} />
              ) : filteredProducts && filteredProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
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
                    {isFetchingNextPage && <Loader2 className="w-8 h-8 animate-spin text-flipkart-blue" />}
                  </div>
                </>
              ) : (
                <div className="text-center py-20">
                  <img src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/error-no-search-results_2353c5.png" alt="No Results" className="w-64 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Sorry, no results found!</h3>
                  <p className="text-gray-500 mb-4">Please check the spelling or try searching for something else</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PremiumFooter />
      <QuickViewModal
        product={quickViewProduct}
        open={!!quickViewProduct}
        onOpenChange={(open) => !open && setQuickViewProduct(null)}
      />
    </div>
  );
}
