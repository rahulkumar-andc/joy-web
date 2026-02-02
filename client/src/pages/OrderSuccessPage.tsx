import { Link, useLocation } from "wouter";
import { CheckCircle, ShoppingBag, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function OrderSuccessPage() {
    const [location] = useLocation();
    const searchParams = new URLSearchParams(location.split('?')[1]);
    const paymentMethod = searchParams.get('method');
    const isCOD = paymentMethod === 'cod';
    const orderId = searchParams.get('orderId');

    return (
        <div className="min-h-screen bg-background font-body flex flex-col">
            <Navbar />

            <div className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-border/50">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                            {isCOD ? (
                                <Banknote className="w-10 h-10 text-green-600" />
                            ) : (
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold font-display text-primary">Order Confirmed!</h1>
                        <p className="text-muted-foreground">
                            {isCOD
                                ? "Thank you for your order. Your order will be delivered soon."
                                : "Thank you for your purchase. We have received your order and payment."}
                        </p>
                    </div>

                    {isCOD ? (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left space-y-3">
                            <div className="flex items-center gap-2">
                                <Banknote className="w-5 h-5 text-yellow-700" />
                                <h3 className="font-semibold text-yellow-900">Cash on Delivery</h3>
                            </div>
                            <div className="text-sm space-y-1">
                                <p className="flex justify-between">
                                    <span className="text-yellow-800">Order ID:</span>
                                    <span className="font-medium">#{orderId}</span>
                                </p>
                                <p className="text-yellow-700 mt-3">
                                    📦 <strong>Important:</strong>
                                </p>
                                <ul className="text-xs space-y-1 text-yellow-700 ml-4">
                                    <li>• Keep exact cash amount ready</li>
                                    <li>• Verify your order before payment</li>
                                    <li>• Get a delivery receipt</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
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
                    )}

                    <div className="pt-4 space-y-3">
                        <Link href="/shop">
                            <Button className="w-full h-12 text-lg gap-2">
                                <ShoppingBag className="w-5 h-5" />
                                Continue Shopping
                            </Button>
                        </Link>
                        {orderId && (
                            <Link href={`/orders/${orderId}/track`}>
                                <Button variant="outline" className="w-full h-10 text-sm">
                                    Track Order
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
