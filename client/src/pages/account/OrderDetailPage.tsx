import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function OrderDetailPage() {
    const { id } = useParams();
    const [, setLocation] = useLocation();

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Button variant="ghost" className="mb-6 pl-0 hover:pl-0 hover:bg-transparent" onClick={() => setLocation("/orders")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Orders
            </Button>

            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Order #{id}</h1>
                    <p className="text-muted-foreground">Placed on January 30, 2026</p>
                </div>
                <Button variant="outline">Download Invoice</Button>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <div className="border rounded-lg p-6">
                        <h3 className="font-semibold mb-4">Items Provided</h3>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">Order items details loading...</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="border rounded-lg p-6">
                        <h3 className="font-semibold mb-4">Order Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>₹ 0.00</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Shipping</span>
                                <span>₹ 0.00</span>
                            </div>
                            <div className="border-t pt-2 mt-2 font-medium flex justify-between">
                                <span>Total</span>
                                <span>₹ 0.00</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
