import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
    TrendingUp,
    DollarSign,
    Share2,
    Users,
    Shield,
    CheckCircle,
    ArrowRight,
    Smartphone,
    Gift,
    Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import gridBg from "@/assets/grid.svg";

export default function BecomeResellerPage() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [upiId, setUpiId] = useState("");

    // Check if user is already a reseller
    const { data: existingReseller, isLoading: checkingReseller } = useQuery({
        queryKey: ["/api/reseller/profile"],
        retry: false,
    });

    const joinMutation = useMutation({
        mutationFn: async (data: { upiId?: string }) => {
            const res = await apiRequest("POST", "/api/reseller/join", data);
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Application Submitted!",
                description: "Your reseller application is under review. We'll notify you once approved.",
            });
            setLocation("/reseller/dashboard");
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to submit application",
                variant: "destructive",
            });
        },
    });

    if (checkingReseller) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (existingReseller && typeof existingReseller === 'object' && !("error" in (existingReseller as object))) {
        setLocation("/reseller/dashboard");
        return null;
    }

    const benefits = [
        {
            icon: DollarSign,
            title: "Earn Up to 12% Commission",
            description: "Start at 5% and grow to 12% as you climb tiers",
        },
        {
            icon: Share2,
            title: "Share & Earn",
            description: "Share product links on WhatsApp, Instagram & more",
        },
        {
            icon: Gift,
            title: "No Inventory Required",
            description: "We handle shipping, returns & customer support",
        },
        {
            icon: Zap,
            title: "Instant Payouts",
            description: "Get your earnings via UPI or bank transfer",
        },
    ];

    const tiers = [
        { name: "Bronze", orders: "0+", rate: "5%", color: "bg-amber-600" },
        { name: "Silver", orders: "50+", rate: "7%", color: "bg-gray-400" },
        { name: "Gold", orders: "200+", rate: "10%", color: "bg-yellow-500" },
        { name: "Platinum", orders: "500+", rate: "12%", color: "bg-purple-600" },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-r from-primary/90 to-primary py-20 text-white">
                <div
                    className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: `url(${gridBg})` }}
                ></div>
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm mb-6">
                            <Users className="h-4 w-4" />
                            Join 10,000+ Resellers
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-6">
                            Turn Your Network Into Earnings
                        </h1>
                        <p className="text-xl opacity-90 mb-8">
                            Share products you love and earn commission on every sale.
                            No investment, no inventory, no hassle.
                        </p>
                        <Button
                            size="lg"
                            variant="secondary"
                            className="text-lg px-8"
                            onClick={() => document.getElementById('join-form')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            Start Earning Today
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-16 container mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-12">Why Become a Reseller?</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {benefits.map((benefit, index) => (
                        <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                            <CardContent className="pt-8 pb-6">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                                    <benefit.icon className="h-8 w-8" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                                <p className="text-muted-foreground">{benefit.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* Commission Tiers */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-4">Commission Tiers</h2>
                    <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
                        The more you sell, the more you earn. Climb the tiers to unlock higher commissions.
                    </p>
                    <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                        {tiers.map((tier, index) => (
                            <Card key={index} className={`relative overflow-hidden ${index === 3 ? 'ring-2 ring-primary' : ''}`}>
                                <div className={`absolute top-0 left-0 right-0 h-1 ${tier.color}`}></div>
                                <CardContent className="pt-8 pb-6 text-center">
                                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${tier.color} text-white font-bold mb-4`}>
                                        {tier.rate}
                                    </div>
                                    <h3 className="font-bold text-xl mb-1">{tier.name}</h3>
                                    <p className="text-sm text-muted-foreground">{tier.orders} orders</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-16 container mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
                <div className="max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row gap-8">
                        {[
                            { step: 1, title: "Sign Up", desc: "Join our reseller program for free" },
                            { step: 2, title: "Share Products", desc: "Create custom links for products you love" },
                            { step: 3, title: "Get Orders", desc: "When someone buys using your link" },
                            { step: 4, title: "Earn Commission", desc: "Get paid to your UPI or bank account" },
                        ].map((item, index) => (
                            <div key={index} className="flex-1 text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white font-bold mb-4">
                                    {item.step}
                                </div>
                                <h3 className="font-semibold mb-2">{item.title}</h3>
                                <p className="text-sm text-muted-foreground">{item.desc}</p>
                                {index < 3 && (
                                    <div className="hidden md:block absolute right-0 top-1/2 transform -translate-y-1/2">
                                        <ArrowRight className="h-6 w-6 text-muted-foreground/30" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Join Form */}
            <section id="join-form" className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <Card className="max-w-lg mx-auto">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">Join as Reseller</CardTitle>
                            <CardDescription>
                                Start your journey to earning extra income today
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="upi">UPI ID (Optional)</Label>
                                <Input
                                    id="upi"
                                    placeholder="yourname@upi"
                                    value={upiId}
                                    onChange={(e) => setUpiId(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    You can add this later in settings
                                </p>
                            </div>

                            <div className="space-y-3">
                                {[
                                    "I agree to the Reseller Terms & Conditions",
                                    "I understand commissions are paid after order delivery",
                                    "I will not use fake or misleading promotions",
                                ].map((term, index) => (
                                    <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                        {term}
                                    </div>
                                ))}
                            </div>

                            <Button
                                className="w-full"
                                size="lg"
                                onClick={() => joinMutation.mutate({ upiId: upiId || undefined })}
                                disabled={joinMutation.isPending}
                            >
                                {joinMutation.isPending ? (
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Submitting...
                                    </div>
                                ) : (
                                    <>
                                        <TrendingUp className="mr-2 h-5 w-5" />
                                        Become a Reseller
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Trust Indicators */}
            <section className="py-12 bg-slate-50">
                <div className="container mx-auto px-4">
                    <div className="flex flex-wrap justify-center gap-8 text-center text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            <span>Secure Payments</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Smartphone className="h-5 w-5" />
                            <span>Mobile Friendly</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            <span>10,000+ Resellers</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            <span>₹5Cr+ Paid Out</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
