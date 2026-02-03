import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { SellerLayout } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import {
    Loader2,
    Wallet,
    TrendingUp,
    TrendingDown,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    IndianRupee,
    Download
} from "lucide-react";
import { format } from "date-fns";

interface WalletData {
    pendingBalance: string;
    availableBalance: string;
    holdBalance: string;
    totalEarned: string;
    totalWithdrawn: string;
}

interface Transaction {
    id: number;
    type: string;
    amount: string;
    description: string;
    balanceAfter: string;
    status: string;
    createdAt: string;
}

const transactionTypeColors: Record<string, string> = {
    credit: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    debit: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    hold: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export default function SellerWalletPage() {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState("");

    // Fetch wallet balance
    const { data: wallet, isLoading: walletLoading } = useQuery<WalletData>({
        queryKey: ["seller-wallet"],
        queryFn: async () => {
            const res = await fetch("/api/seller/wallet", {
                credentials: "include"
            });
            if (!res.ok) {
                if (res.status === 401) {
                    navigate("/auth?redirect=/seller/wallet");
                    throw new Error("Please login");
                }
                throw new Error("Failed to fetch wallet");
            }
            return res.json();
        },
    });

    // Fetch transactions
    const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
        queryKey: ["seller-transactions", page, typeFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
            });
            if (typeFilter !== "all") params.set("type", typeFilter);

            const res = await fetch(`/api/seller/transactions?${params}`, {
                credentials: "include"
            });
            if (!res.ok) throw new Error("Failed to fetch transactions");
            return res.json();
        },
    });

    // Request payout mutation
    const payoutMutation = useMutation({
        mutationFn: async (amount: number) => {
            const res = await fetch("/api/seller/payout/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ amount }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to request payout");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["seller-wallet"] });
            queryClient.invalidateQueries({ queryKey: ["seller-transactions"] });
            toast({
                title: "Payout Requested",
                description: "Your payout request has been submitted for approval",
            });
            setPayoutDialogOpen(false);
            setPayoutAmount("");
        },
        onError: (error: Error) => {
            toast({
                title: "Payout Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleRequestPayout = () => {
        const amount = parseFloat(payoutAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({
                title: "Invalid Amount",
                description: "Please enter a valid amount",
                variant: "destructive",
            });
            return;
        }

        const available = parseFloat(wallet?.availableBalance || "0");
        if (amount > available) {
            toast({
                title: "Insufficient Balance",
                description: "Amount exceeds available balance",
                variant: "destructive",
            });
            return;
        }

        payoutMutation.mutate(amount);
    };

    const isLoading = walletLoading || transactionsLoading;

    if (isLoading) {
        return (
            <SellerLayout title="Wallet & Payouts">
                <div className="h-[50vh] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </SellerLayout>
        );
    }

    const availableBalance = parseFloat(wallet?.availableBalance || "0");
    const pendingBalance = parseFloat(wallet?.pendingBalance || "0");
    const holdBalance = parseFloat(wallet?.holdBalance || "0");
    const totalEarned = parseFloat(wallet?.totalEarned || "0");
    const totalWithdrawn = parseFloat(wallet?.totalWithdrawn || "0");

    return (
        <SellerLayout
            title="Wallet & Payouts"
            subtitle="Manage your earnings and request payouts"
            actions={
                <Button
                    onClick={() => setPayoutDialogOpen(true)}
                    disabled={availableBalance <= 0}
                    className="bg-green-600 hover:bg-green-700 text-white"
                >
                    <Download className="mr-2 h-4 w-4" />
                    Request Payout
                </Button>
            }
        >
            <div className="space-y-6">

                {/* Balance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">
                                Available Balance
                            </CardTitle>
                            <Wallet className="h-5 w-5 opacity-90" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                ₹{availableBalance.toLocaleString()}
                            </div>
                            <p className="text-xs opacity-75 mt-1">Ready for withdrawal</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Pending Balance
                            </CardTitle>
                            <Clock className="h-5 w-5 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ₹{pendingBalance.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Awaiting delivery confirmation
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Earned
                            </CardTitle>
                            <TrendingUp className="h-5 w-5 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ₹{totalEarned.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Lifetime earnings</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Withdrawn
                            </CardTitle>
                            <TrendingDown className="h-5 w-5 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ₹{totalWithdrawn.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Paid out to bank
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Hold Balance Info */}
                {holdBalance > 0 && (
                    <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                        <CardContent className="py-4">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-orange-500" />
                                <div>
                                    <p className="font-medium text-orange-800 dark:text-orange-200">
                                        ₹{holdBalance.toLocaleString()} on hold
                                    </p>
                                    <p className="text-sm text-orange-600 dark:text-orange-300">
                                        This amount is reserved for potential refunds or disputes
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Transactions */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <CardTitle>Transaction History</CardTitle>
                                <CardDescription>Recent wallet activity</CardDescription>
                            </div>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Transactions</SelectItem>
                                    <SelectItem value="credit">Credits</SelectItem>
                                    <SelectItem value="debit">Debits</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {transactionsData?.transactions?.length === 0 ? (
                            <div className="text-center py-12">
                                <IndianRupee className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
                                <p className="text-muted-foreground">
                                    Transactions will appear here when you start receiving orders
                                </p>
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Balance After</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactionsData?.transactions?.map((tx: Transaction) => (
                                            <TableRow key={tx.id}>
                                                <TableCell>
                                                    <Badge className={transactionTypeColors[tx.type] || ""}>
                                                        {tx.type === "credit" && <ArrowDownRight className="h-3 w-3 mr-1" />}
                                                        {tx.type === "debit" && <ArrowUpRight className="h-3 w-3 mr-1" />}
                                                        {tx.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="max-w-[300px] truncate">
                                                    {tx.description}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={tx.type === "credit" ? "text-green-600" : "text-red-600"}>
                                                        {tx.type === "credit" ? "+" : "-"}₹{parseFloat(tx.amount).toLocaleString()}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    ₹{parseFloat(tx.balanceAfter).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Pagination */}
                                {transactionsData?.totalPages > 1 && (
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
                                            Page {page} of {transactionsData.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page >= transactionsData.totalPages}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Payout Request Dialog */}
            <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request Payout</DialogTitle>
                        <DialogDescription>
                            Enter the amount you want to withdraw to your bank account
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">Available Balance</p>
                            <p className="text-2xl font-bold">₹{availableBalance.toLocaleString()}</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="payoutAmount">Withdrawal Amount</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                                <Input
                                    id="payoutAmount"
                                    type="number"
                                    placeholder="0.00"
                                    value={payoutAmount}
                                    onChange={(e) => setPayoutAmount(e.target.value)}
                                    className="pl-8"
                                    min={1}
                                    max={availableBalance}
                                />
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setPayoutAmount(availableBalance.toString())}
                        >
                            Withdraw Full Amount
                        </Button>

                        <p className="text-xs text-muted-foreground">
                            Payouts are processed within 3-5 business days. Minimum withdrawal: ₹100
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRequestPayout}
                            disabled={payoutMutation.isPending || !payoutAmount}
                        >
                            {payoutMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Request Payout
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SellerLayout>
    );
}
