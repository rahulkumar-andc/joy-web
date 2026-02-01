import { useParams } from "wouter";
import { CheckCircle2 } from "lucide-react";

export default function RefundStatusPage() {
    const { id } = useParams();

    return (
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
            <div className="flex justify-center mb-6">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>

            <h1 className="text-3xl font-bold mb-4">Refund Processed</h1>
            <p className="text-muted-foreground mb-8">
                Your refund for Order #{id} has been initiated.
            </p>

            <div className="bg-muted p-6 rounded-lg text-left max-w-md mx-auto">
                <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Refund ID</span>
                    <span className="font-mono">ref_123456</span>
                </div>
                <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold">₹ 1,299.00</span>
                </div>
                <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Method</span>
                    <span>Original Payment Method</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Date</span>
                    <span>Feb 5, 2026</span>
                </div>
            </div>
        </div>
    );
}
