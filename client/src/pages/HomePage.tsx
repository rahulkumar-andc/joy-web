import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/ProductCard";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  const { data: products, isLoading } = useProducts({ sort: "featured" });

  // Hero section image from Unsplash
  const heroImage = "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop";

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[85vh] w-full overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-black/20" />
        </div>
        
        <div className="container relative h-full flex flex-col justify-center items-center text-center text-white px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight mb-6"
          >
            Summer Edit '24
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl font-light max-w-lg mb-10 text-white/90"
          >
            Discover the new collection defined by effortless elegance and timeless silhouettes.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          >
            <Link href="/shop">
              <Button size="lg" className="bg-white text-black hover:bg-white/90 px-8 py-6 text-base uppercase tracking-widest rounded-none">
                Shop Collection
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-24 bg-background">
        <div className="container px-4">
          <div className="flex justify-between items-end mb-12">
            <h2 className="font-display text-4xl">Categories</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Coats & Jackets", img: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=800&q=80", link: "/shop?category=jackets" },
              { title: "Dresses", img: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80", link: "/shop?category=dresses" },
              { title: "Accessories", img: "https://images.unsplash.com/photo-1511556820780-d912e42b4980?w=800&q=80", link: "/shop?category=accessories" },
            ].map((cat, i) => (
              <Link href={cat.link} key={i}>
                <div className="group relative aspect-[4/5] overflow-hidden cursor-pointer">
                  <img 
                    src={cat.img} 
                    alt={cat.title} 
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute bottom-8 left-8">
                    <h3 className="text-white font-display text-2xl font-medium flex items-center gap-2">
                      {cat.title} 
                      <ArrowRight className="h-5 w-5 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals Grid */}
      <section className="py-24 bg-secondary/30">
        <div className="container px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-display text-4xl mb-2">New Arrivals</h2>
              <p className="text-muted-foreground">Just in time for the season.</p>
            </div>
            <Link href="/shop">
              <Button variant="link" className="text-primary hover:no-underline group">
                View All <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 aspect-[3/4] mb-4" />
                  <div className="h-4 bg-gray-200 w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 w-1/4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
              {products?.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Editorial/Story */}
      <section className="py-24 overflow-hidden">
        <div className="container px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative aspect-square">
               {/* editorial image portrait */}
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&q=80"
                alt="Editorial"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="order-1 lg:order-2 space-y-8">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Our Philosophy</span>
              <h2 className="font-display text-4xl lg:text-5xl leading-tight">
                Design that transcends <br/> the ordinary.
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                We believe in the power of simplicity. Our collections are crafted with precision, using only the finest materials to ensure longevity and timeless style.
              </p>
              <Button variant="outline" className="rounded-none border-primary text-primary px-8 py-6 uppercase tracking-widest hover:bg-primary hover:text-white transition-colors">
                Read Our Story
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
