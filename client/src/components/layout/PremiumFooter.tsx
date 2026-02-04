import { Link } from "wouter";
import { Facebook, Twitter, Instagram, Youtube, Send, MapPin, Phone, Mail, Star } from "lucide-react";
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
        <footer className="bg-[#172337] text-white font-body text-sm">
            {/* Brand Story Section - Removed or minimized for Flipkart style, but keeping simplistic */}

            {/* Main Footer Content */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 border-b border-white/20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* ABOUT */}
                    <div>
                        <h4 className="text-[#878787] text-[12px] font-medium mb-4 uppercase">About</h4>
                        <ul className="space-y-2 text-[12px] font-bold">
                            <li><Link href="/contact" className="hover:underline">Contact Us</Link></li>
                            <li><Link href="/about" className="hover:underline">About Us</Link></li>
                            <li><Link href="/careers" className="hover:underline">Careers</Link></li>
                            <li><Link href="/stories" className="hover:underline">Stories</Link></li>
                        </ul>
                    </div>

                    {/* HELP */}
                    <div>
                        <h4 className="text-[#878787] text-[12px] font-medium mb-4 uppercase">Help</h4>
                        <ul className="space-y-2 text-[12px] font-bold">
                            <li><Link href="/payments" className="hover:underline">Payments</Link></li>
                            <li><Link href="/shipping" className="hover:underline">Shipping</Link></li>
                            <li><Link href="/cancellation" className="hover:underline">Cancellation & Returns</Link></li>
                            <li><Link href="/faq" className="hover:underline">FAQ</Link></li>
                        </ul>
                    </div>

                    {/* CONSUMER POLICY */}
                    <div>
                        <h4 className="text-[#878787] text-[12px] font-medium mb-4 uppercase">Consumer Policy</h4>
                        <ul className="space-y-2 text-[12px] font-bold">
                            <li><Link href="/cancellation" className="hover:underline">Cancellation & Returns</Link></li>
                            <li><Link href="/terms" className="hover:underline">Terms of Use</Link></li>
                            <li><Link href="/security" className="hover:underline">Security</Link></li>
                            <li><Link href="/privacy" className="hover:underline">Privacy</Link></li>
                        </ul>
                    </div>

                    {/* SOCIAL & MAIL */}
                    <div>
                        <h4 className="text-[#878787] text-[12px] font-medium mb-4 uppercase">Social</h4>
                        <div className="flex items-center gap-4 mb-6">
                            <a href="#" className="hover:text-flipkart-blue"><Facebook className="w-5 h-5" /></a>
                            <a href="#" className="hover:text-flipkart-blue"><Twitter className="w-5 h-5" /></a>
                            <a href="#" className="hover:text-flipkart-blue"><Youtube className="w-5 h-5" /></a>
                        </div>

                        <h4 className="text-[#878787] text-[12px] font-medium mb-4 uppercase">Mail Us:</h4>
                        <p className="text-[12px] leading-relaxed">
                            Steal the Deal Private Limited,<br />
                            Buildings Alyssa, Begonia &<br />
                            Clove Embassy Tech Village,<br />
                            Outer Ring Road, Devarabeesanahalli Village,<br />
                            Bengaluru, 560103,<br />
                            Karnataka, India
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-[#172337] py-6">
                <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-[12px]">
                    <div className="flex items-center gap-4 flex-wrap justify-center">
                        <span className="flex items-center gap-1 text-yellow-500"><MapPin className="w-3 h-3" /> Become a Seller</span>
                        <span className="flex items-center gap-1 text-yellow-500"><Star className="w-3 h-3" /> Advertise</span>
                        <span className="flex items-center gap-1 text-yellow-500"><Send className="w-3 h-3" /> Gift Cards</span>
                        <span className="flex items-center gap-1 text-yellow-500"><Phone className="w-3 h-3" /> Help Center</span>
                    </div>
                    <p>© {currentYear} Steal the Deal. All rights reserved.</p>
                    <img src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/payment-method_69e7ec.svg" alt="Payment Methods" className="h-[15px]" />
                </div>
            </div>
        </footer>
    );
}
