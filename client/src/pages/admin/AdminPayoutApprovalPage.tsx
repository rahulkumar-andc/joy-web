import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Card,
    CardContent,
    CardDescription,
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
    ChevronLeft,
    ChevronRight,
    Wallet,
    IndianRupee,
    Clock
} from "lucide-react";
import { format } from "date-fns";

interface PendingPayout {
    id: number;
    amount: string;
    status: string;
    requestedAt: string;
    seller: {
        id: number;
        shopName: string;
        businessEmail: string;
        accountNumber: string;
        ifscCode: string;
        bankName: string;
        accountHolderName: string;
    };
    wallet: {
        availableBalance: string;
    };
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function AdminPayoutApprovalPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>("pending");
    const [processDialogOpen, setProcessDialogOpen] = useState(false);
    const [selectedPayout, setSelectedPayout] = useState<PendingPayout | null>(null);
    const [action, setAction] = useState<"approve" | "reject">("approve");
    const [transactionId, setTransactionId] = useState("");
    const [note, setNote] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["admin-payouts", page, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
            });
            if (statusFilter !== "all") params.set("status", statusFilter);

            const res = await fetch(`/api/admin/payouts?${params}`, {
                credentials: "include"
            });
            if (!res.ok) throw new Error("Failed to fetch payouts");
            return res.json();
        },
    });

    const processMutation = useMutation({
        mutationFn: async ({ payoutId, action, details }: {
            payoutId: number;
            action: "approve" | "reject";
            details?: { transactionId?: string; note?: string };
        }) => {
            const res = await fetch(`/api/admin/payouts/${payoutId}/process`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ action, ...details }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to process payout");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
            toast({
                title: "Payout Processed",
                description: `Payout has been ${action}d`,
            });
            setProcessDialogOpen(false);
            setSelectedPayout(null);
            setTransactionId("");
            setNote("");
        },
        onError: (error: Error) => {
            toast({
                title: "Processing Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleProcess = (payout: PendingPayout, processAction: "approve" | "reject") => {
        setSelectedPayout(payout);
        setAction(processAction);
        setProcessDialogOpen(true);
    };

    const confirmProcess = () => {
        if (!selectedPayout) return;

        const details: any = { note };
        if (action === "approve") {
            if (!transactionId) {
                toast({
                    title: "Transaction ID Required",
                    description: "Please provide a transaction ID",
                    variant: "destructive",
                });
                return;
            }
            details.transactionId = transactionId;
        }

        processMutation.mutate({
            payoutId: selectedPayout.id,
            action,
            details,
        });
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
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Payout Approval</h1>
                    <p className="text-muted-foreground">
                        Review and process seller payout requests
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardContent className="py-4">
                            <div className="text-2xl font-bold text-yellow-600">
                                {data?.stats?.pending || 0}
                            </div>
                            <p className="text-sm text-muted-foreground">Pending</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="py-4">
                            <div className="text-2xl font-bold text-blue-600">
                                {data?.stats?.processing || 0}
                            </div>
                            <p className="text-sm text-muted-foreground">Processing</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="py-4">
                            <div className="text-2xl font-bold text-green-600">
                                ₹{parseFloat(data?.stats?.totalPending || "0").toLocaleString()}
                            </div>
                            <p className="text-sm text-muted-foreground">Total Pending Amount</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="py-4">
                            <div className="text-2xl font-bold text-green-600">
                                {data?.stats?.completedToday || 0}
                            </div>
                            <p className="text-sm text-muted-foreground">Completed Today</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <CardContent className="py-4">
                        <div className="flex gap-4">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Payouts</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Payouts Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Payout Requests ({data?.total || 0})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data?.payouts?.length === 0 ? (
                            <div className="text-center py-12">
                                <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Payout Requests</h3>
                                <p className="text-muted-foreground">
                                    {statusFilter === "pending"
                                        ? "All payout requests have been processed"
                                        : "No payouts found for this status"}
                                </p>
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Seller</TableHead>
                                            <TableHead>Bank Details</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Wallet Balance</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Requested</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data?.payouts?.map((payout: PendingPayout) => (
                                            <TableRow key={payout.id}>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <div className="font-medium">{payout.seller.shopName}</div>
                                                        <div className="text-muted-foreground">{payout.seller.businessEmail}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <div className="font-medium">{payout.seller.accountHolderName}</div>
                                                        <div className="text-muted-foreground">
                                                            {payout.seller.accountNumber?.replace(/.(?=.{4})/g, '*')}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {payout.seller.bankName} - {payout.seller.ifscCode}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-lg">
                                                        ₹{parseFloat(payout.amount).toLocaleString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        ₹{parseFloat(payout.wallet.availableBalance).toLocaleString()}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={statusColors[payout.status] || ""}>
                                                        {payout.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {format(new Date(payout.requestedAt), "MMM d, yyyy HH:mm")}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {payout.status === "pending" && (
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                onClick={() => handleProcess(payout, "approve")}
                                                            >
                                                                <Check className="h-4 w-4 mr-1" />
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleProcess(payout, "reject")}
                                                            >
                                                                <X className="h-4 w-4 mr-1" />
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {payout.status !== "pending" && (
                                                        <Badge variant="outline" className="capitalize">
                                                            {payout.status}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Pagination */}
                                {data?.totalPages > 1 && (
                                    <div className="flex justify-center items-center gap-2 mt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm text-muted-foreground">
                                            Page {page} of {data.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page >= data.totalPages}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </main>

            {/* Process Payout Dialog */}
            <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {action === "approve" ? "Approve" : "Reject"} Payout
                        </DialogTitle>
                        <DialogDescription>
                            {action === "approve"
                                ? `Process payout of ₹${parseFloat(selectedPayout?.amount || "0").toLocaleString()} to ${selectedPayout?.seller.shopName}`
                                : `Reject payout request from ${selectedPayout?.seller.shopName}`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {action === "approve" ? (
                            <>
                                <div className="p-4 bg-muted rounded-lg space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Amount:</span>
                                        <span className="text-sm font-bold">₹{parseFloat(selectedPayout?.amount || "0").toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Account:</span>
                                        <span className="text-sm">{selectedPayout?.seller.accountNumber}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">IFSC:</span>
                                        <span className="text-sm">{selectedPayout?.seller.ifscCode}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Bank:</span>
                                        <span className="text-sm">{selectedPayout?.seller.bankName}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="transactionId">Transaction ID *</Label>
                                    <Input
                                        id="transactionId"
                                        placeholder="Enter transaction/reference ID"
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Enter the transaction ID from your payment gateway
                                    </p>
                                </div>
                            </>
                        ) : null}

                        <div className="space-y-2">
                            <Label htmlFor="note">Note (Optional)</Label>
                            <Textarea
                                id="note"
                                placeholder="Add any additional notes..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProcessDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className={action === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                            variant={action === "reject" ? "destructive" : "default"}
                            onClick={confirmProcess}
                            disabled={processMutation.isPending || (action === "approve" && !transactionId)}
                        >
                            {processMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {action === "approve" ? "Process Payout" : "Reject Payout"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
