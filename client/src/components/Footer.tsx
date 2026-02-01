import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SizeGuideDialog } from "@/components/SizeGuideDialog";
import { useToast } from "@/hooks/use-toast";

export function Footer() {
  const { toast } = useToast();

  const handleSubscribe = () => {
    toast({
      title: "Subscribed!",
      description: "You've successfully subscribed to our newsletter.",
    });
  };

  return (
    <footer className="bg-primary text-primary-foreground pt-16 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Steal the Deal" className="h-10 w-10 object-contain" />
              <span className="font-display text-xl font-bold tracking-tight">Steal the Deal</span>
            </Link>
            <p className="text-sm text-primary-foreground/70 font-body leading-relaxed max-w-xs">
              Your one-stop destination for unbeatable deals on quality products.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors"><Instagram className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Shop</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li><Link href="/shop?category=women" className="hover:text-accent transition-colors">Women</Link></li>
              <li><Link href="/shop?category=men" className="hover:text-accent transition-colors">Men</Link></li>
              <li><Link href="/shop?category=accessories" className="hover:text-accent transition-colors">Accessories</Link></li>
              <li><Link href="/shop?sort=newest" className="hover:text-accent transition-colors">New Arrivals</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Help</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li><Link href="/shipping" className="hover:text-accent transition-colors">Shipping & Returns</Link></li>
              <li><Link href="/faq" className="hover:text-accent transition-colors">FAQ</Link></li>
              <li>
                <SizeGuideDialog trigger={
                  <span className="hover:text-accent transition-colors cursor-pointer">Size Guide</span>
                } />
              </li>
              <li><Link href="/contact" className="hover:text-accent transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Stay in Touch</h4>
            <p className="text-sm text-primary-foreground/70 mb-4">Subscribe to receive updates, access to exclusive deals, and more.</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter your email"
                className="bg-primary-foreground/10 border-none placeholder:text-primary-foreground/40 text-primary-foreground focus-visible:ring-accent"
              />
              <Button size="icon" className="bg-accent hover:bg-accent/90 text-primary" onClick={handleSubscribe}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-primary-foreground/50">
          <p>© 2024 Steal the Deal. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-primary-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-primary-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
