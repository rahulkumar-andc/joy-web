import { Badge } from "@/components/ui/badge";

interface Props {
    status: string;
}

export function TicketStatusBadge({ status }: Props) {
    const styles: Record<string, string> = {
        OPEN: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200",
        ASSIGNED: "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200",
        IN_PROGRESS: "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200",
        WAITING_FOR_CUSTOMER: "bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200",
        ESCALATED: "bg-red-100 text-red-800 hover:bg-red-200 border-red-200",
        RESOLVED: "bg-green-100 text-green-800 hover:bg-green-200 border-green-200",
        CLOSED: "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200",
    };

    const labels: Record<string, string> = {
        OPEN: "Open",
        ASSIGNED: "Assigned",
        IN_PROGRESS: "In Progress",
        WAITING_FOR_CUSTOMER: "Waiting",
        ESCALATED: "Escalated",
        RESOLVED: "Resolved",
        CLOSED: "Closed",
    };

    return (
        <Badge className={`${styles[status] || "bg-gray-100 text-gray-800"} px-2 py-0.5 rounded-full font-medium border`}>
            {labels[status] || status}
        </Badge>
    );
}

export function TicketPriorityBadge({ priority }: { priority: string }) {
    const styles: Record<string, string> = {
        LOW: "bg-gray-100 text-gray-600 border-gray-200",
        MEDIUM: "bg-blue-50 text-blue-600 border-blue-200",
        HIGH: "bg-orange-50 text-orange-600 border-orange-200",
        CRITICAL: "bg-red-50 text-red-600 border-red-200 animate-pulse",
    };

    return (
        <Badge variant="outline" className={`${styles[priority] || "bg-gray-50"} border`}>
            {priority}
        </Badge>
    );
}
