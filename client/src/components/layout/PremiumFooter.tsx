import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Youtube, Send, MapPin, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SizeGuideDialog } from "@/components/SizeGuideDialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { motion } from "framer-motion";

export function PremiumFooter() {
    const { toast } = useToast();
    const [email, setEmail] = useState("");
    const [isSubscribing, setIsSubscribing] = useState(false);

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsSubscribing(true);
        // Simulate subscription
        await new Promise((resolve) => setTimeout(resolve, 800));
        setIsSubscribing(false);
        setEmail("");

        toast({
            title: "Welcome to the family!",
            description: "You'll be the first to know about new arrivals and exclusive offers.",
        });
    };

    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-primary text-primary-foreground">
            {/* Brand Story Section */}
            <div className="border-b border-primary-foreground/10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="max-w-3xl mx-auto text-center">
                        <Link href="/" className="inline-flex items-center gap-3 mb-6">
                            <img
                                src="/logo.png"
                                alt="Steal the Deal"
                                className="h-14 w-14 object-contain"
                            />
                            <span className="font-display text-3xl font-bold tracking-tight">
                                Steal the Deal
                            </span>
                        </Link>
                        <p className="text-primary-foreground/70 font-body leading-relaxed text-lg">
                            Curating timeless fashion pieces that blend luxury with accessibility.
                            Every item tells a story, every deal is an opportunity to express your unique style.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Footer Content */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {/* Shop Categories */}
                    <div>
                        <h4 className="font-display text-lg font-semibold mb-6">Shop</h4>
                        <ul className="space-y-4 text-sm">
                            <li>
                                <Link
                                    href="/shop?category=women"
                                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                                >
                                    Women's Collection
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/shop?category=men"
                                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                                >
                                    Men's Collection
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/shop?category=accessories"
                                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                                >
                                    Accessories
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/shop?sort=newest"
                                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                                >
                                    New Arrivals
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/shop?sale=true"
                                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                                >
                                    Sale
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Help & Support */}
                    <div>
                        <h4 className="font-display text-lg font-semibold mb-6">Help</h4>
                        <ul className="space-y-4 text-sm">
                            <li>
                                <Link
                                    href="/shipping"
                                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                                >
                                    Shipping & Delivery
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/return-policy"
                                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                                >
                                    Returns & Exchanges
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/faq"
                                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                                >
                                    FAQ
                                </Link>
                            </li>
                            <li>
                                <SizeGuideDialog
                                    trigger={
                                        <span className="text-primary-foreground/70 hover:text-accent transition-colors cursor-pointer">
                                            Size Guide
                                        </span>
                                    }
                                />
                            </li>
                            <li>
                                <Link
                                    href="/contact"
                                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                                >
                                    Contact Us
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/help-center"
                                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                                >
                                    Help Center
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="font-display text-lg font-semibold mb-6">Company</h4>
                        <ul className="space-y-4 text-sm">
                            <li>
                                <Link
                                    href="/about"
                                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                                >
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/seller"
                                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                                >
                                    Sell With Us
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/privacy"
                                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                                >
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/terms"
                                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                                >
                                    Terms of Service
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Newsletter & Contact */}
                    <div>
                        <h4 className="font-display text-lg font-semibold mb-6">Stay Connected</h4>
                        <p className="text-sm text-primary-foreground/70 mb-4">
                            Subscribe for exclusive offers, new arrivals, and style inspiration.
                        </p>
                        <form onSubmit={handleSubscribe} className="flex gap-2 mb-8">
                            <Input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-primary-foreground/10 border-primary-foreground/20 placeholder:text-primary-foreground/40 text-primary-foreground focus:border-accent focus-visible:ring-accent"
                                required
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={isSubscribing}
                                className="bg-accent hover:bg-accent/90 text-white shrink-0"
                            >
                                {isSubscribing ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Send className="w-4 h-4" />
                                    </motion.div>
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </Button>
                        </form>

                        {/* Social Links */}
                        <div className="flex items-center gap-4">
                            <a
                                href="#"
                                className="p-2 rounded-full bg-primary-foreground/10 text-primary-foreground/70 hover:bg-accent hover:text-white transition-all"
                                aria-label="Facebook"
                            >
                                <Facebook className="w-4 h-4" />
                            </a>
                            <a
                                href="#"
                                className="p-2 rounded-full bg-primary-foreground/10 text-primary-foreground/70 hover:bg-accent hover:text-white transition-all"
                                aria-label="Instagram"
                            >
                                <Instagram className="w-4 h-4" />
                            </a>
                            <a
                                href="#"
                                className="p-2 rounded-full bg-primary-foreground/10 text-primary-foreground/70 hover:bg-accent hover:text-white transition-all"
                                aria-label="Twitter"
                            >
                                <Twitter className="w-4 h-4" />
                            </a>
                            <a
                                href="#"
                                className="p-2 rounded-full bg-primary-foreground/10 text-primary-foreground/70 hover:bg-accent hover:text-white transition-all"
                                aria-label="YouTube"
                            >
                                <Youtube className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-primary-foreground/10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-primary-foreground/50">
                        <p>© {currentYear} Steal the Deal. All rights reserved.</p>
                        <div className="flex flex-wrap items-center justify-center gap-6">
                            <Link href="/privacy" className="hover:text-primary-foreground transition-colors">
                                Privacy Policy
                            </Link>
                            <Link href="/terms" className="hover:text-primary-foreground transition-colors">
                                Terms of Service
                            </Link>
                            <Link href="/privacy-settings" className="hover:text-primary-foreground transition-colors">
                                Cookie Settings
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
