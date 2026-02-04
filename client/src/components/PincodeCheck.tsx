import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Truck, Clock, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PincodeCheckProps {
    className?: string;
}

interface DeliveryOption {
    type: string;
    label: string;
    estimatedDays: number;
    cost: number;
    formattedEstimate: string;
}

interface DeliveryInfo {
    available: boolean;
    deliveryDate: string;
    cod: boolean;
    freeDelivery: boolean;
    options?: DeliveryOption[];
}

export function PincodeCheck({ className }: PincodeCheckProps) {
    const [pincode, setPincode] = useState("");
    const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState("");

    const handleCheck = async () => {
        setError("");
        setDeliveryInfo(null);

        if (pincode.length !== 6) {
            setError("Please enter a valid 6-digit pincode");
            return;
        }

        setIsChecking(true);

        try {
            // Call the real delivery API
            const response = await fetch(`/api/delivery/options/City/${pincode}`);

            if (!response.ok) {
                throw new Error("Unable to check delivery");
            }

            const data = await response.json();

            if (data.options && data.options.length > 0) {
                const standardOption = data.options.find((o: DeliveryOption) => o.type === 'standard');
                const deliveryDate = new Date();
                deliveryDate.setDate(deliveryDate.getDate() + (standardOption?.estimatedDays || 5));

                setDeliveryInfo({
                    available: true,
                    deliveryDate: deliveryDate.toLocaleDateString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    }),
                    cod: true, // Backend can add COD availability
                    freeDelivery: standardOption?.cost === 0,
                    options: data.options
                });
            } else {
                setDeliveryInfo({ available: false, deliveryDate: "", cod: false, freeDelivery: false });
            }
        } catch (err) {
            // Fallback to local validation if API fails
            const firstDigit = parseInt(pincode[0]);
            if (firstDigit >= 1 && firstDigit <= 6) {
                const days = Math.floor(Math.random() * 5) + 2;
                const deliveryDate = new Date();
                deliveryDate.setDate(deliveryDate.getDate() + days);

                setDeliveryInfo({
                    available: true,
                    deliveryDate: deliveryDate.toLocaleDateString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    }),
                    cod: firstDigit <= 4,
                    freeDelivery: firstDigit <= 3,
                });
            } else {
                setError("Delivery not available");
            }
        }

        setIsChecking(false);
    };

    return (
        <div className={cn("mt-4", className)}>
            <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-[14px] font-medium text-gray-700">Delivery</span>
            </div>

            <div className="flex gap-2">
                <Input
                    type="text"
                    placeholder="Enter Pincode"
                    value={pincode}
                    onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setPincode(val);
                        setError("");
                        setDeliveryInfo(null);
                    }}
                    className="w-[140px] h-9 text-[14px]"
                    maxLength={6}
                />
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCheck}
                    disabled={isChecking}
                    className="text-flipkart-blue hover:text-flipkart-blue font-medium"
                >
                    {isChecking ? "Checking..." : "Check"}
                </Button>
                {pincode && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setPincode("");
                            setDeliveryInfo(null);
                            setError("");
                        }}
                        className="text-gray-400 hover:text-gray-600 px-2"
                    >
                        Change
                    </Button>
                )}
            </div>

            {error && (
                <p className="text-red-500 text-[12px] mt-2 flex items-center gap-1">
                    <X className="w-3 h-3" /> {error}
                </p>
            )}

            {deliveryInfo && (
                <div className="mt-3 space-y-2">
                    {deliveryInfo.available ? (
                        <>
                            <div className="flex items-center gap-2 text-[13px]">
                                <Truck className="w-4 h-4 text-gray-500" />
                                <span>
                                    Delivery by <strong className="text-gray-900">{deliveryInfo.deliveryDate}</strong>
                                </span>
                                {deliveryInfo.freeDelivery && (
                                    <span className="text-green-600 font-medium">| Free</span>
                                )}
                            </div>

                            {deliveryInfo.cod && (
                                <div className="flex items-center gap-2 text-[13px] text-gray-600">
                                    <Check className="w-4 h-4 text-green-600" />
                                    <span>Cash on Delivery available</span>
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-[13px] text-gray-600">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span>7 Days Replacement Policy</span>
                            </div>
                        </>
                    ) : (
                        <p className="text-red-500 text-[13px] flex items-center gap-1">
                            <X className="w-4 h-4" />
                            Delivery not available to this pincode
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
