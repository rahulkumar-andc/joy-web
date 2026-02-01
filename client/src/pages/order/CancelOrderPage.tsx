import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function CancelOrderPage() {
    const { id } = useParams();

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6">Cancel Order #{id}</h1>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-8">
                <p className="text-sm text-yellow-800">
                    Are you sure you want to cancel this order? This action cannot be undone.
                </p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2">Reason for cancellation</label>
                    <Textarea placeholder="Please tell us why you are cancelling..." />
                </div>

                <div className="flex gap-4">
                    <Button variant="destructive" className="flex-1">Confirm Cancellation</Button>
                    <Button variant="outline" className="flex-1">Nevermind, Keep Order</Button>
                </div>
            </div>
        </div>
    );
}
