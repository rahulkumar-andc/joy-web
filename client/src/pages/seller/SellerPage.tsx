import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { TrendingUp, ShieldCheck, DollarSign, Package } from "lucide-react";

export default function SellerPage() {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            {/* Hero Section */}
            <section className="relative pt-20 pb-20 md:pt-32 md:pb-32 overflow-hidden">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-6"
                        >
                            Turn Your Closet into <span className="text-accent">Cash</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-xl text-muted-foreground mb-8"
                        >
                            Join thousands of sellers on Steal the Deal. List your items in seconds and reach millions of shoppers.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Link href="/seller/register">
                                <Button size="lg" className="text-lg px-8 py-6 rounded-full">
                                    Start Selling Now
                                </Button>
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 bg-muted/30">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <FeatureCard
                            icon={<TrendingUp className="w-8 h-8 text-accent" />}
                            title="Reach Millions"
                            description="Get your products in front of our massive active user base immediately."
                        />
                        <FeatureCard
                            icon={<DollarSign className="w-8 h-8 text-accent" />}
                            title="Low Fees"
                            description="Keep more of what you earn with our competitive commission rates."
                        />
                        <FeatureCard
                            icon={<ShieldCheck className="w-8 h-8 text-accent" />}
                            title="Secure Payments"
                            description="Get paid quickly and securely directly to your bank account."
                        />
                        <FeatureCard
                            icon={<Package className="w-8 h-8 text-accent" />}
                            title="Easy Shipping"
                            description="We handle the logistics. Just print the label and ship."
                        />
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <div className="bg-background p-8 rounded-2xl border border-border/50 hover:border-accent/50 transition-colors">
            <div className="mb-4 p-3 bg-accent/10 rounded-xl w-fit">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
        </div>
    );
}
