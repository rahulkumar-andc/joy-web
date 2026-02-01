import { Button } from "@/components/ui/button";
import { CreditCard, Trash2 } from "lucide-react";

export default function SavedPaymentsPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">Saved Payment Methods</h1>

            <div className="grid gap-6">
                <div className="border rounded-lg p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-muted p-3 rounded-full">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-semibold">Visa ending in 4242</p>
                            <p className="text-sm text-muted-foreground">Expires 12/28</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>

                <div className="border-dashed border-2 rounded-lg p-6 text-center">
                    <p className="text-muted-foreground mb-4">No other payment methods saved.</p>
                    <Button variant="outline">Add New Card</Button>
                </div>
            </div>
        </div>
    );
}
