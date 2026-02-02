import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Check,
    X,
    MessageSquare,
    Package
} from "lucide-react";
import { format } from "date-fns";

interface ReturnRequest {
    id: number;
    returnNumber: string;
    reason: string;
    description: string;
    status: string;
    createdAt: string;
    sellerResponse?: string;
    sellerOrder: {
        id: number;
        sellerOrderNumber: string;
        subtotal: string;
    };
    customer: {
        id: number;
        name: string;
        email: string;
    };
}

const statusColors: Record<string, string> = {
    requested: "bg-yellow-100 text-yellow-800",
    seller_approved: "bg-green-100 text-green-800",
    seller_rejected: "bg-red-100 text-red-800",
    admin_review: "bg-purple-100 text-purple-800",
    pickup_scheduled: "bg-blue-100 text-blue-800",
    closed: "bg-gray-100 text-gray-800",
    refund_approved: "bg-green-100 text-green-800",
};

export default function SellerReturnRequestsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [page, setPage] = useState(1);
    const [processDialogOpen, setProcessDialogOpen] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
    const [action, setAction] = useState<"approve" | "reject">("approve");
    const [response, setResponse] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["seller-returns", page, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                status: statusFilter
            });
            const res = await fetch(`/api/seller/return-requests?${params}`, {
                credentials: "include"
            });
            if (!res.ok) throw new Error("Failed to fetch return requests");
            return res.json();
        },
    });

    const respondMutation = useMutation({
        mutationFn: async ({ id, action, response }: { id: number; action: string; response: string }) => {
            const res = await fetch(`/api/seller/return-requests/${id}/respond`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    // Adding simple CSRF mitigation if needed, but 'credentials: include' plus standard server protection is key.
                    // For now assuming Cookie based auth is sufficient or server handles it.
                },
                credentials: "include",
                body: JSON.stringify({ action, response }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to respond");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["seller-returns"] });
            toast({
                title: "Response Submitted",
                description: `Return request has been ${action}ed.`
            });
            setProcessDialogOpen(false);
            setSelectedReturn(null);
            setResponse("");
        },
        onError: (error: Error) => {
            toast({
                title: "Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleProcess = (request: ReturnRequest, processAction: "approve" | "reject") => {
        setSelectedReturn(request);
        setAction(processAction);
        setResponse("");
        setProcessDialogOpen(true);
    };

    const confirmProcess = () => {
        if (!selectedReturn) return;
        if (response.length < 10) {
            toast({
                title: "Validation Error",
                description: "Response must be at least 10 characters.",
                variant: "destructive"
            });
            return;
        }
        respondMutation.mutate({
            id: selectedReturn.id,
            action,
            response,
        });
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Return Requests</h1>
                    <p className="text-muted-foreground">
                        Manage customer return requests and approvals
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Returns ({data?.total || 0})</CardTitle>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="requested">Pending Action</SelectItem>
                                <SelectItem value="seller_approved">Approved</SelectItem>
                                <SelectItem value="seller_rejected">Rejected</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {data?.requests?.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No return requests found.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Return #</TableHead>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.requests.map((req: ReturnRequest) => (
                                    <TableRow key={req.id}>
                                        <TableCell className="font-medium">{req.returnNumber}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">{req.sellerOrder.sellerOrderNumber}</div>
                                            <div className="text-xs text-muted-foreground">₹{req.sellerOrder.subtotal}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{req.reason}</div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{req.description}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusColors[req.status] || ""}>
                                                {req.status.replace("_", " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{req.customer.name}</TableCell>
                                        <TableCell className="text-right">
                                            {req.status === "requested" ? (
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700" onClick={() => handleProcess(req, "approve")}>
                                                        <Check className="h-4 w-4 mr-1" /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleProcess(req, "reject")}>
                                                        <X className="h-4 w-4 mr-1" /> Reject
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">
                                                    {req.sellerResponse ? "Responded" : "-"}
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{action === "approve" ? "Approve Return" : "Reject Return"}</DialogTitle>
                        <DialogDescription>
                            {action === "approve"
                                ? "Approving will schedule a pickup attempt. Please confirm."
                                : "Rejecting may cause the customer to raise a dispute. Please provide a valid reason."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Response / Reason</label>
                            <Textarea
                                value={response}
                                onChange={(e) => setResponse(e.target.value)}
                                placeholder={action === "approve" ? "e.g. Return approved, pickup schedule initiated." : "e.g. Item not eligible for return because..."}
                                className="min-h-[100px]"
                            />
                            {response.length > 0 && response.length < 10 && (
                                <p className="text-xs text-red-500">Must be at least 10 characters.</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant={action === "approve" ? "default" : "destructive"}
                            onClick={confirmProcess}
                            disabled={respondMutation.isPending}
                        >
                            {respondMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Confirm {action === "approve" ? "Approval" : "Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
