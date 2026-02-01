import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function ReturnPage() {
    const { id } = useParams();

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6">Return / Replace Items</h1>
            <p className="text-muted-foreground mb-8">Order #{id}</p>

            <div className="space-y-8">
                <div className="border rounded-lg p-6">
                    <h3 className="font-semibold mb-4">Select items to return</h3>
                    <p className="text-sm text-muted-foreground">Order items items loading...</p>
                </div>

                <div>
                    <h3 className="font-semibold mb-4">What would you like to do?</h3>
                    <RadioGroup defaultValue="refund">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="refund" id="r1" />
                            <Label htmlFor="r1">Return for Refund</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="replace" id="r2" />
                            <Label htmlFor="r2">Replace with same item</Label>
                        </div>
                    </RadioGroup>
                </div>

                <Button className="w-full">Continue</Button>
            </div>
        </div>
    );
}
