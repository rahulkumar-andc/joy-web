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
import { Label } from "@/components/ui/label";
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
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Check,
    X,
    TriangleAlert,
    Ban,
    Undo2,
    MessageSquare
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
    sellerRespondedAt?: string;
    adminNote?: string;
    seller: {
        id: number;
        shopName: string;
        businessEmail: string;
    };
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

// Status colors
const statusColors: Record<string, string> = {
    requested: "bg-yellow-100 text-yellow-800",
    seller_approved: "bg-green-100 text-green-800",
    seller_rejected: "bg-red-100 text-red-800",
    admin_review: "bg-purple-100 text-purple-800 border-purple-200 border", // Emphasize dispute
    pickup_scheduled: "bg-blue-100 text-blue-800",
    closed: "bg-gray-100 text-gray-800",
    refund_approved: "bg-green-100 text-green-800",
};

export default function AdminReturnDisputesPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState<string>("admin_review"); // Default to disputes
    const [page, setPage] = useState(1);
    const [processDialogOpen, setProcessDialogOpen] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
    const [action, setAction] = useState<"approve" | "reject" | "refund">("approve");
    const [note, setNote] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["admin-returns", page, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
                status: statusFilter
            });
            const res = await fetch(`/api/admin/return-requests?${params}`, {
                credentials: "include"
            });
            if (!res.ok) throw new Error("Failed to fetch return requests");
            return res.json();
        },
    });

    const resolveMutation = useMutation({
        mutationFn: async ({ id, action, note }: { id: number; action: string; note: string }) => {
            // Get CSRF token
            const csrfToken = document.cookie
                .split("; ")
                .find((row) => row.startsWith("CSRF-TOKEN="))
                ?.split("=")[1];

            const res = await fetch(`/api/admin/return-requests/${id}/resolve`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken || ""
                },
                credentials: "include",
                body: JSON.stringify({ action, note }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to resolve dispute");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-returns"] });
            toast({
                title: "Dispute Resolved",
                description: `Return request has been processed successfully.`,
            });
            setProcessDialogOpen(false);
            setSelectedReturn(null);
            setNote("");
        },
        onError: (error: Error) => {
            toast({
                title: "Resolution Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleProcess = (request: ReturnRequest, processAction: "approve" | "reject" | "refund") => {
        setSelectedReturn(request);
        setAction(processAction);
        setNote(""); // Reset note
        setProcessDialogOpen(true);
    };

    const confirmProcess = () => {
        if (!selectedReturn) return;
        resolveMutation.mutate({
            id: selectedReturn.id,
            action,
            note,
        });
    };

    // Helper text for dialog
    const getActionDescription = () => {
        switch (action) {
            case "approve": return "Schedule pickup (Overrule Seller Rejection)";
            case "reject": return "Close return request (Uphold Seller Rejection)";
            case "refund": return "Immediate Refund (Bypass Pickup)";
            default: return "";
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Return Disputes</h1>
                    <p className="text-muted-foreground">
                        Moderate return requests and resolve seller-customer disputes
                    </p>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <CardContent className="py-4">
                        <div className="flex gap-4 items-center">
                            <span className="text-sm font-medium">Filter Status:</span>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Requests</SelectItem>
                                    <SelectItem value="admin_review">Disputes (Admin Review)</SelectItem>
                                    <SelectItem value="seller_rejected">Seller Rejected</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                    <SelectItem value="refund_approved">Refund Approved</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Return Requests ({data?.total || 0})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data?.requests?.length === 0 ? (
                            <div className="text-center py-12">
                                <TriangleAlert className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Returns Found</h3>
                                <p className="text-muted-foreground">No return requests match current filters.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Return #</TableHead>
                                        <TableHead>Seller / Customer</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Seller Response</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data?.requests?.map((req: ReturnRequest) => (
                                        <TableRow key={req.id}>
                                            <TableCell>
                                                <div className="font-medium">{req.returnNumber}</div>
                                                <div className="text-xs text-muted-foreground">Order: {req.sellerOrder.sellerOrderNumber}</div>
                                                <div className="text-xs text-muted-foreground">{format(new Date(req.createdAt), "MMM d, yyyy")}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm font-medium">{req.seller.shopName}</div>
                                                <div className="text-xs text-muted-foreground">{req.customer.name}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{req.reason}</div>
                                                <div className="text-xs text-muted-foreground truncate max-w-[150px]">{req.description}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[req.status] || ""}>
                                                    {req.status.replace("_", " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {req.sellerResponse ? (
                                                    <div className="text-sm max-w-[200px]">
                                                        <div className="font-medium text-xs text-muted-foreground">Response:</div>
                                                        "{req.sellerResponse}"
                                                    </div>
                                                ) : <span className="text-muted-foreground text-xs italic">No response</span>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {(req.status === "admin_review" || req.status === "seller_rejected") && (
                                                    <div className="flex flex-col gap-2 items-end">
                                                        <Button size="sm" variant="default" className="w-[120px]" onClick={() => handleProcess(req, "approve")}>
                                                            <Undo2 className="h-3 w-3 mr-1" /> Overrule
                                                        </Button>
                                                        <Button size="sm" variant="destructive" className="w-[120px]" onClick={() => handleProcess(req, "reject")}>
                                                            <Ban className="h-3 w-3 mr-1" /> Uphold Reject
                                                        </Button>
                                                    </div>
                                                )}
                                                {!["admin_review", "seller_rejected"].includes(req.status) && (
                                                    <Button variant="ghost" size="sm" disabled>
                                                        Details
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </main>

            <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Resolve Dispute</DialogTitle>
                        <DialogDescription>
                            Review the dispute and take action.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedReturn && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-md space-y-2 text-sm">
                                <div className="grid grid-cols-2 gap-2">
                                    <span className="font-medium text-muted-foreground">Return Reason:</span>
                                    <span>{selectedReturn.reason}</span>

                                    <span className="font-medium text-muted-foreground">Customer Note:</span>
                                    <span className="col-span-2 italic">"{selectedReturn.description}"</span>

                                    <span className="font-medium text-muted-foreground mt-2">Seller Response:</span>
                                    <span className="col-span-2 font-medium">"{selectedReturn.sellerResponse || "N/A"}"</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Action: {getActionDescription()}</Label>
                                {action === "approve" && <p className="text-xs text-blue-600">This will schedule a pickup attempt, effectively overruling the seller's rejection.</p>}
                                {action === "reject" && <p className="text-xs text-red-600">This will close the return request, upholding the seller's decision.</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="note">Admin Resolution Note</Label>
                                <Textarea
                                    id="note"
                                    placeholder="Explain your decision..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant={action === "reject" ? "destructive" : "default"}
                            onClick={confirmProcess}
                            disabled={resolveMutation.isPending}
                        >
                            {resolveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Confirm Resolution
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
