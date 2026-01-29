import { useHomepage, useProducts } from "@/hooks/use-products";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { type Product } from "@shared/schema";
import { motion } from "framer-motion";
import { Truck, ShieldCheck, RefreshCcw, ArrowRight, Loader2 } from "lucide-react";
import { FlashSale } from "@/components/FlashSale";
import { SEO } from "@/components/SEO";
import { useState, useEffect } from "react";

export default function HomePage() {
  const { data: homepageData, isLoading } = useHomepage();
  const { data: products } = useProducts();

  // Flash Sale Countdown Logic
  const calculateTimeLeft = () => {
    // Set a fixed end date (e.g., 2 days from now) or dynamic
    const difference = +new Date("2026-02-01") - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
      };
    } else {
      // Reset or hide
      timeLeft = { days: 0, hours: 0, minutes: 0 };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState<{ days?: number, hours?: number, minutes?: number }>(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute

    return () => clearTimeout(timer);
  });

  // Get featured products (first 4 products as fallback when no homepage sections)
  const featuredProducts = products?.slice(0, 4) || [];

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background font-body">
      <SEO />
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-[80vh] w-full overflow-hidden bg-gradient-to-r from-[#FCEFE9] to-[#F8E4D9]">
        <div className="container mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1 space-y-6 z-10 pt-12 md:pt-0 text-center md:text-left relative"
          >
            <span className="text-accent uppercase tracking-[0.2em] font-bold text-sm">New Collection 2024</span>
            <h1 className="font-display text-5xl md:text-7xl font-bold text-primary leading-tight">
              Step into <br /> <span className="text-accent italic">Style</span> & Elegance
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto md:mx-0">
              Discover curated luxury fashion pieces that define your personality. Timeless designs for the modern wardrobe.
            </p>
            <div className="pt-4">
              <Link href="/shop">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8 py-6 rounded-full text-md">
                  Shop Now <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-1 h-full relative hidden md:block"
          >
            {/* Model Image - Unsplash */}
            <div className="absolute inset-0 flex items-end justify-center">
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop"
                alt="Fashion Model"
                className="h-[90%] object-contain drop-shadow-2xl"
              />
            </div>
          </motion.div>
        </div>

        {/* Decorative circle */}
        <div className="absolute top-0 right-0 w-2/3 h-full bg-white/30 skew-x-12 translate-x-1/4 pointer-events-none"></div>
      </section>

      {/* Features Banner */}
      <section className="bg-white py-12 border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Truck, title: "Free Shipping", desc: "On all orders over ₹2000" },
              { icon: RefreshCcw, title: "Easy Returns", desc: "30-day money back guarantee" },
              { icon: ShieldCheck, title: "Secure Payment", desc: "100% protected payments" },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -5 }}
                className="flex items-center space-x-4 p-6 rounded-2xl bg-warm-beige border border-border/50 shadow-sm"
              >
                <div className="p-3 bg-white rounded-full text-accent shadow-sm">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-primary">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Categories */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary mb-4">Trending Categories</h2>
            <p className="text-muted-foreground">Explore our most popular collections</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Women's Collection", img: "https://images.unsplash.com/photo-1550614000-4b9519e0037a?q=80&w=800&auto=format&fit=crop", link: "/shop?category=women" },
              { name: "Men's Collection", img: "https://images.unsplash.com/photo-1617137968427-85924c809a22?q=80&w=800&auto=format&fit=crop", link: "/shop?category=men" },
              { name: "Accessories", img: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800&auto=format&fit=crop", link: "/shop?category=accessories" },
            ].map((cat, idx) => (
              <Link key={idx} href={cat.link} className="group relative h-96 rounded-2xl overflow-hidden cursor-pointer">
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                <div className="absolute bottom-0 inset-x-0 p-8">
                  <h3 className="text-2xl font-display font-bold text-white mb-2">{cat.name}</h3>
                  <span className="inline-flex items-center text-white/90 font-medium group-hover:translate-x-2 transition-transform">
                    Shop Now <ArrowRight className="ml-2 w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Sections from DB */}
      {homepageData?.map((section) => (
        <section key={section.section.id} className="py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-primary mb-2">{section.section.title}</h2>
                <div className="h-1 w-20 bg-accent rounded-full"></div>
              </div>
              <Link href="/shop">
                <Button variant="outline" className="hidden md:flex">View All</Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {section.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-20 container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
            <div>
              <span className="text-accent font-bold tracking-widest uppercase text-sm">Curated For You</span>
              <h2 className="font-display text-4xl font-bold mt-2 text-primary">Featured Collection</h2>
            </div>
            <Link href="/shop">
              <Button variant="outline" className="group">
                View All Products
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.map((product: Product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Flash Sale Banner */}
      <section className="py-24 bg-[url('https://images.unsplash.com/photo-1507915135761-41a0a222c709?q=80&w=2071&auto=format&fit=crop')] bg-cover bg-fixed bg-center relative">
        <div className="absolute inset-0 bg-primary/80" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="uppercase tracking-widest text-accent font-bold mb-4 block">Limited Time Offer</span>
            <h2 className="font-display text-5xl md:text-7xl font-bold mb-6">Flash Sale</h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">Get up to 60% off on selected items. Don't miss out on the season's hottest trends.</p>
            <div className="flex justify-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg min-w-[80px]">
                <span className="block text-3xl font-bold">{timeLeft.days || 0}</span>
                <span className="text-xs uppercase">Days</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg min-w-[80px]">
                <span className="block text-3xl font-bold">{timeLeft.hours || 0}</span>
                <span className="text-xs uppercase">Hours</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg min-w-[80px]">
                <span className="block text-3xl font-bold">{timeLeft.minutes || 0}</span>
                <span className="text-xs uppercase">Mins</span>
              </div>
            </div>
            <div className="mt-10">
              <Link href="/shop">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 px-10">Shop Sale</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Recently Viewed */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <RecentlyViewed />
        </div>
      </section>

      <Footer />
    </div>
  );
}
