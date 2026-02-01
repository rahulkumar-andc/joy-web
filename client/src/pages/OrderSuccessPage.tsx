import { Link } from "wouter";
import { CheckCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function OrderSuccessPage() {
    return (
        <div className="min-h-screen bg-background font-body flex flex-col">
            <Navbar />

            <div className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-border/50">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold font-display text-primary">Order Confirmed!</h1>
                        <p className="text-muted-foreground">
                            Thank you for your purchase. We have received your order and payment.
                        </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg text-sm text-left space-y-2">
                        <p className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-medium text-green-600">Payment Successful</span>
                        </p>
                        <p className="flex justify-between">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-medium">Sent to your inbox</span>
                        </p>
                    </div>

                    <div className="pt-4">
                        <Link href="/shop">
                            <Button className="w-full h-12 text-lg gap-2">
                                <ShoppingBag className="w-5 h-5" />
                                Continue Shopping
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
