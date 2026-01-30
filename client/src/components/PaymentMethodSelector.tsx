import { cn } from "@/lib/utils";
import { CreditCard, Wallet, Smartphone } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export type PaymentMethodType = "upi" | "card" | "netbanking";

interface PaymentMethodSelectorProps {
    selectedMethod: PaymentMethodType;
    onSelect: (method: PaymentMethodType) => void;
    className?: string;
}

export function PaymentMethodSelector({
    selectedMethod,
    onSelect,
    className,
}: PaymentMethodSelectorProps) {
    return (
        <div className={cn("space-y-4", className)}>
            <h3 className="text-lg font-semibold mb-3">Select Payment Method</h3>
            <RadioGroup
                value={selectedMethod}
                onValueChange={(val) => onSelect(val as PaymentMethodType)}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
                <div>
                    <RadioGroupItem value="upi" id="upi" className="peer sr-only" />
                    <Label
                        htmlFor="upi"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer h-full transition-all"
                    >
                        <Smartphone className="mb-3 h-6 w-6 text-primary" />
                        <div className="text-center">
                            <span className="block font-semibold">UPI</span>
                            <span className="text-xs text-muted-foreground mt-1">
                                GPay, PhonePe, Paytm
                            </span>
                        </div>
                    </Label>
                </div>

                <div>
                    <RadioGroupItem value="card" id="card" className="peer sr-only" />
                    <Label
                        htmlFor="card"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer h-full transition-all"
                    >
                        <CreditCard className="mb-3 h-6 w-6 text-primary" />
                        <div className="text-center">
                            <span className="block font-semibold">Card</span>
                            <span className="text-xs text-muted-foreground mt-1">
                                Credit & Debit Cards
                            </span>
                        </div>
                    </Label>
                </div>

                <div>
                    <RadioGroupItem value="netbanking" id="netbanking" className="peer sr-only" />
                    <Label
                        htmlFor="netbanking"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer h-full transition-all"
                    >
                        <Wallet className="mb-3 h-6 w-6 text-primary" />
                        <div className="text-center">
                            <span className="block font-semibold">Net Banking</span>
                            <span className="text-xs text-muted-foreground mt-1">
                                All Indian Banks
                            </span>
                        </div>
                    </Label>
                </div>
            </RadioGroup>
        </div>
    );
}
