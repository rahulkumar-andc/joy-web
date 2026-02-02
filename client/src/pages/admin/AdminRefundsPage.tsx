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
import { Input } from "@/components/ui/input";
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
    RotateCcw,
    AlertCircle,
    FileText
} from "lucide-react";
import { format } from "date-fns";

interface RefundRequest {
    id: number;
    orderId: number;
    userId: number;
    amount: string;
    reason: string;
    description: string;
    status: string;
    refundMethod: string;
    createdAt: string;
    order: {
        id: number;
        totalAmount: string;
    };
    user: {
        email: string;
    };
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export default function AdminRefundsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [processDialogOpen, setProcessDialogOpen] = useState(false);
    const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
    const [action, setAction] = useState<"approved" | "rejected">("approved");
    const [adminNote, setAdminNote] = useState("");

    const { data: refunds, isLoading } = useQuery({
        queryKey: ["admin-refunds"],
        queryFn: async () => {
            const res = await fetch("/api/admin/refunds");
            if (!res.ok) throw new Error("Failed to fetch refunds");
            return res.json();
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, adminNote }: { id: number; status: string; adminNote?: string }) => {
            const res = await fetch(`/api/admin/refunds/${id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, adminNote }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to update refund status");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
            toast({
                title: "Refund Updated",
                description: `Refund status updated to ${action}`,
            });
            setProcessDialogOpen(false);
            setSelectedRefund(null);
            setAdminNote("");
        },
        onError: (error: Error) => {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleProcess = (refund: RefundRequest, processAction: "approved" | "rejected") => {
        setSelectedRefund(refund);
        setAction(processAction);
        setProcessDialogOpen(true);
    };

    const confirmProcess = () => {
        if (!selectedRefund) return;

        updateStatusMutation.mutate({
            id: selectedRefund.id,
            status: action,
            adminNote,
        });
    };

    const filteredRefunds = refunds?.filter((r: RefundRequest) =>
        statusFilter === "all" ? true : r.status === statusFilter
    );

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
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Refund Processing</h1>
                    <p className="text-muted-foreground">
                        Manage customer refund requests
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
                                    <SelectItem value="all">All Refunds</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Refunds Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Refund Requests ({filteredRefunds?.length || 0})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {filteredRefunds?.length === 0 ? (
                            <div className="text-center py-12">
                                <RotateCcw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Refunds Found</h3>
                                <p className="text-muted-foreground">
                                    No refund requests match your filter.
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order #</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Requested</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRefunds?.map((refund: RefundRequest) => (
                                        <TableRow key={refund.id}>
                                            <TableCell className="font-medium">#{refund.orderId}</TableCell>
                                            <TableCell>{refund.user.email}</TableCell>
                                            <TableCell>₹{parseFloat(refund.amount).toLocaleString()}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={refund.reason}>
                                                {refund.reason}
                                            </TableCell>
                                            <TableCell className="capitalize">{refund.refundMethod}</TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[refund.status] || ""}>
                                                    {refund.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(new Date(refund.createdAt), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {refund.status === "pending" && (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() => handleProcess(refund, "approved")}
                                                        >
                                                            <Check className="h-4 w-4 mr-1" />
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleProcess(refund, "rejected")}
                                                        >
                                                            <X className="h-4 w-4 mr-1" />
                                                            Reject
                                                        </Button>
                                                    </div>
                                                )}
                                                {refund.status !== "pending" && (
                                                    <Button variant="ghost" size="sm" onClick={() => {
                                                        setSelectedRefund(refund);
                                                        setAdminNote(refund.description || ""); // Just show description or something
                                                        // Actually we can't edit resolved refunds easily
                                                    }} disabled>
                                                        <FileText className="h-4 w-4 mr-1" />
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

            {/* Process Dialog */}
            <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {action === "approved" ? "Approve" : "Reject"} Refund
                        </DialogTitle>
                        <DialogDescription>
                            {action === "approved"
                                ? `Approve refund of ₹${parseFloat(selectedRefund?.amount || "0").toLocaleString()} for Order #${selectedRefund?.orderId}.`
                                : `Reject refund request for Order #${selectedRefund?.orderId}.`}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedRefund?.refundMethod === "original" && action === "approved" && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800 flex gap-2">
                            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0" />
                            <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                <strong>Note:</strong> Payment gateway integration is pending.
                                Approving this will update the system status but you must manually process the refund in your payment dashboard.
                            </div>
                        </div>
                    )}

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Reason provided by user:</Label>
                            <div className="p-3 bg-muted rounded-md text-sm">
                                {selectedRefund?.reason}
                                {selectedRefund?.description && (
                                    <div className="mt-1 text-muted-foreground border-t pt-1 border-border/50">
                                        {selectedRefund.description}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="adminNote">Admin Note (Optional)</Label>
                            <Textarea
                                id="adminNote"
                                placeholder="Add internal note..."
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className={action === "approved" ? "bg-green-600 hover:bg-green-700" : ""}
                            variant={action === "rejected" ? "destructive" : "default"}
                            onClick={confirmProcess}
                            disabled={updateStatusMutation.isPending}
                        >
                            {updateStatusMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {action === "approved" ? "Approve Refund" : "Reject Refund"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
