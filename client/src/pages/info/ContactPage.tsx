import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast({
            title: "Message Sent",
            description: "We'll get back to you as soon as possible!",
        });
        (e.target as HTMLFormElement).reset();
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow container mx-auto px-4 py-12">
                <h1 className="text-4xl font-display font-bold text-primary mb-8 text-center">Contact Us</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
                            <p className="text-muted-foreground">
                                Have questions about our collections, sizing, or shipping? We're here to help.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-accent/10 rounded-full text-accent">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-medium">Email</h3>
                                    <p className="text-sm text-muted-foreground">support@stealthedeal.com</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-accent/10 rounded-full text-accent">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-medium">Phone</h3>
                                    <p className="text-sm text-muted-foreground">+91 123 456 7890</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-accent/10 rounded-full text-accent">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-medium">Office</h3>
                                    <p className="text-sm text-muted-foreground">123 Fashion Street, Mumbai, India</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-2xl border border-border/50 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">First Name</label>
                                    <Input required placeholder="John" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Last Name</label>
                                    <Input required placeholder="Doe" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <Input required type="email" placeholder="john@example.com" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Message</label>
                                <Textarea required placeholder="How can we help you?" className="min-h-[120px]" />
                            </div>

                            <Button type="submit" className="w-full">Send Message</Button>
                        </form>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
