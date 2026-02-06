
import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "Order Placed", className: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200" },
    paid: { label: "Confirmed", className: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-indigo-200" },
    packed: { label: "Packed", className: "bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200" },
    shipped: { label: "Shipped", className: "bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200" },
    out_for_delivery: { label: "Out for Delivery", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200" },
    delivered: { label: "Delivered", className: "bg-green-100 text-green-800 hover:bg-green-100 border-green-200" },
    cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200" },
    refunded: { label: "Refunded", className: "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200" },
};

export function OrderStatusBadge({ status }: { status: string }) {
    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };

    return (
        <Badge variant="outline" className={`px-2.5 py-0.5 text-xs font-semibold border ${config.className}`}>
            {config.label}
        </Badge>
    );
}
