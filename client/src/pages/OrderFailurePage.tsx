import { Link } from "wouter";
import { XCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function OrderFailurePage() {
    return (
        <div className="min-h-screen bg-background font-body flex flex-col">
            <Navbar />

            <div className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-border/50">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                            <XCircle className="w-10 h-10 text-red-600" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold font-display text-primary">Payment Failed</h1>
                        <p className="text-muted-foreground">
                            We couldn't process your payment. No money was deducted from your account.
                        </p>
                    </div>

                    <div className="pt-4 space-y-3">
                        <Link href="/checkout">
                            <Button className="w-full h-12 text-lg gap-2">
                                <RefreshCcw className="w-5 h-5" />
                                Try Again
                            </Button>
                        </Link>

                        <Link href="/contact">
                            <Button variant="outline" className="w-full h-12">
                                Contact Support
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
