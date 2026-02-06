
import { Check, Truck, Package, CreditCard, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineStep {
    label: string;
    date?: string;
    status: "completed" | "current" | "pending" | "cancelled";
    icon: any;
}

export function OrderTimeline({ status, dates }: { status: string, dates: any }) {
    const steps: TimelineStep[] = [
        {
            label: "Order Placed",
            date: dates.createdAt,
            status: "completed",
            icon: Check
        },
        {
            label: "Processing",
            date: dates.paymentDate,
            status: ["pending", "cancelled"].includes(status) ? (status === "cancelled" ? "cancelled" : "current") : "completed",
            icon: CreditCard
        },
        {
            label: "Shipped",
            date: dates.shippedAt,
            status: ["shipped", "out_for_delivery", "delivered"].includes(status) ? "completed" : (status === "packed" ? "current" : "pending"),
            icon: Package
        },
        {
            label: "Out for Delivery",
            date: undefined,
            status: ["out_for_delivery", "delivered"].includes(status) ? "completed" : (status === "shipped" ? "current" : "pending"),
            icon: Truck
        },
        {
            label: "Delivered",
            date: dates.deliveredAt,
            status: status === "delivered" ? "completed" : "pending",
            icon: Check
        }
    ];

    if (status === "cancelled") {
        return (
            <div className="flex items-center gap-2 text-destructive font-semibold p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                <XCircle className="w-5 h-5" /> Order Cancelled
            </div>
        )
    }

    return (
        <div className="relative flex flex-col md:flex-row justify-between w-full p-4">
            {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center flex-1 relative z-10">
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                        step.status === "completed" ? "bg-primary border-primary text-primary-foreground" :
                            step.status === "current" ? "bg-primary/20 border-primary text-primary animate-pulse" :
                                "bg-muted border-muted-foreground/30 text-muted-foreground"
                    )}>
                        <step.icon className="w-4 h-4" />
                    </div>
                    <div className="mt-2 text-center">
                        <p className={cn("text-xs font-semibold", step.status === "pending" && "text-muted-foreground")}>{step.label}</p>
                        {step.date && <p className="text-[10px] text-muted-foreground">{new Date(step.date).toLocaleDateString()}</p>}
                    </div>
                    {/* Connector Line */}
                    {idx < steps.length - 1 && (
                        <div className={cn(
                            "hidden md:block absolute top-4 left-1/2 w-full h-[2px] -z-10",
                            step.status === "completed" ? "bg-primary" : "bg-muted"
                        )} />
                    )}
                </div>
            ))}
        </div>
    );
}
