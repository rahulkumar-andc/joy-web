import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Search,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    Clock,
    FileText
} from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
    requested: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    pending_approval: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    processing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

interface Payout {
    id: number;
    payoutNumber: string;
    amount: string;
    status: string;
    shopName: string;
    sellerName: string;
    bankAccountName: string;
    bankAccountNumber: string;
    bankIfscCode: string;
    createdAt: string;
    approvedAt?: string;
    processedAt?: string;
    failureReason?: string;
}

export default function AdminPayoutApprovalPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
    const [actionNote, setActionNote] = useState("");
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

    // Fetch Payouts
    const { data, isLoading } = useQuery({
        queryKey: ["admin-payouts", page, statusFilter, search],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
            });
            if (statusFilter !== "all") params.set("status", statusFilter);
            if (search) params.set("search", search);

            const res = await fetch(`/api/admin/payouts?${params}`, {
                credentials: "include"
            });
            if (!res.ok) throw new Error("Failed to fetch payouts");
            return res.json();
        },
    });

    const mutation = useMutation({
        mutationFn: async ({ id, action, note }: { id: number; action: string; note?: string }) => {
            const res = await fetch(`/api/admin/payouts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ action, note }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Action failed");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
            toast({ title: "Success", description: "Payout status updated" });
            setIsRejectDialogOpen(false);
            setActionNote("");
            setSelectedPayout(null);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleAction = (payout: Payout, action: string) => {
        if (action === 'reject') {
            setSelectedPayout(payout);
            setIsRejectDialogOpen(true);
            return;
        }

        if (confirm(`Are you sure you want to ${action} this payout request for ₹${payout.amount}?`)) {
            mutation.mutate({ id: payout.id, action });
        }
    };

    if (isLoading) {
        return (
            <AdminLayout title="Payouts" subtitle="Manage seller withdrawals">
                <div className="flex h-60 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout
            title="Payouts Management"
            subtitle="Process and track seller withdrawal requests"
        >
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.payouts?.filter((p: Payout) => p.status === 'requested').length || 0}</div>
                        <p className="text-xs text-muted-foreground">Requires attention</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Processing</CardTitle>
                        <Loader2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.payouts?.filter((p: Payout) => p.status === 'processing' || p.status === 'approved').length || 0}</div>
                        <p className="text-xs text-muted-foreground">In bank queue</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.total || 0}</div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by Shop Name or Payout ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="requested">Requested</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Rejected/Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Payouts Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Payout Requests</CardTitle>
                    <CardDescription>Review and manage disbursement requests.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Payout ID</TableHead>
                                <TableHead>Seller</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Bank Info</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.payouts?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No payout requests found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.payouts?.map((payout: Payout) => (
                                    <TableRow key={payout.id}>
                                        <TableCell className="font-medium font-mono">{payout.payoutNumber}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{payout.shopName}</span>
                                                <span className="text-xs text-muted-foreground">{payout.sellerName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(payout.createdAt), "MMM d, yyyy")}
                                        </TableCell>
                                        <TableCell className="font-bold">₹{parseFloat(payout.amount).toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Badge className={`${statusColors[payout.status] || "bg-gray-100"}`}>
                                                {payout.status.replace("_", " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs">
                                                <p className="font-semibold">{payout.bankAccountName || "Bank"}</p>
                                                <p>Acct: ••••{payout.bankAccountNumber.slice(-4)}</p>
                                                <p>IFSC: {payout.bankIfscCode}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {payout.status === 'requested' && (
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(payout, 'approve')}>
                                                        Approve
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleAction(payout, 'reject')}>
                                                        Reject
                                                    </Button>
                                                </div>
                                            )}
                                            {payout.status === 'approved' && (
                                                <Button size="sm" variant="secondary" onClick={() => handleAction(payout, 'process')}>
                                                    Mark Processed
                                                </Button>
                                            )}
                                            {['completed', 'cancelled', 'failed'].includes(payout.status) && (
                                                <Button size="sm" variant="ghost" disabled>
                                                    <FileText className="h-4 w-4 mr-1" /> Details
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {data?.total > 20 && (
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
                                Page {page} of {Math.ceil(data.total / 20)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= Math.ceil(data.total / 20)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Payout Request</DialogTitle>
                        <DialogDescription>
                            Provide a reason for rejecting this payout. The amount will be refunded to the seller's wallet.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Reason for rejection..."
                        value={actionNote}
                        onChange={(e) => setActionNote(e.target.value)}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedPayout && mutation.mutate({ id: selectedPayout.id, action: 'reject', note: actionNote })}
                            disabled={!actionNote.trim()}
                        >
                            Reject & Refund
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
