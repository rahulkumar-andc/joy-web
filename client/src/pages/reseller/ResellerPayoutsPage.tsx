import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
    Wallet,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronLeft,
    CreditCard,
    Smartphone,
    ArrowRight,
    Calendar,
    Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

interface Payout {
    id: number;
    amount: string;
    payoutMethod: "bank" | "upi";
    status: "pending" | "processing" | "completed" | "failed" | "cancelled";
    transactionId?: string;
    failureReason?: string;
    createdAt: string;
    completedAt?: string;
}

interface DashboardData {
    balance: {
        pending: number;
        total: number;
    };
    reseller: {
        upiId?: string;
        bankAccountNumber?: string;
        bankIfscCode?: string;
        bankAccountHolder?: string;
    };
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    pending: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100", label: "Pending" },
    processing: { icon: Clock, color: "text-blue-600", bg: "bg-blue-100", label: "Processing" },
    completed: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100", label: "Completed" },
    failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-100", label: "Failed" },
    cancelled: { icon: AlertCircle, color: "text-gray-600", bg: "bg-gray-100", label: "Cancelled" },
};

export default function ResellerPayoutsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<"bank" | "upi">("upi");

    const { data: dashboard } = useQuery<DashboardData>({
        queryKey: ["/api/reseller/dashboard"],
    });

    const { data: payouts, isLoading } = useQuery<Payout[]>({
        queryKey: ["/api/reseller/payouts"],
    });

    const withdrawMutation = useMutation({
        mutationFn: async (data: { amount: number; payoutMethod: "bank" | "upi" }) => {
            const res = await apiRequest("POST", "/api/reseller/payouts", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/reseller/dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["/api/reseller/payouts"] });
            toast({
                title: "Payout Requested",
                description: "Your withdrawal is being processed",
            });
            setShowWithdraw(false);
            setAmount("");
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to request payout",
                variant: "destructive",
            });
        },
    });

    const balance = dashboard?.balance?.pending || 0;
    const hasUpi = !!dashboard?.reseller?.upiId;
    const hasBank = !!dashboard?.reseller?.bankAccountNumber;

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Payouts</h1>
                        <p className="text-muted-foreground">
                            Withdraw your earnings to bank or UPI
                        </p>
                    </div>
                    <Link to="/reseller/dashboard">
                        <Button variant="outline">
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>

                {/* Balance & Withdraw Card */}
                <Card className="mb-8 bg-gradient-to-br from-primary to-primary/90 text-white">
                    <CardContent className="py-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <p className="text-sm opacity-80 mb-1">Available Balance</p>
                                <p className="text-4xl font-bold">₹{balance.toLocaleString()}</p>
                                <p className="text-sm opacity-80 mt-2">
                                    Minimum withdrawal: ₹100
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    onClick={() => setShowWithdraw(true)}
                                    disabled={balance < 100}
                                >
                                    <Wallet className="mr-2 h-5 w-5" />
                                    Withdraw
                                </Button>
                                <Link to="/reseller/bank">
                                    <Button variant="outline" size="lg" className="bg-transparent border-white/30 text-white hover:bg-white/10">
                                        <CreditCard className="mr-2 h-5 w-5" />
                                        Bank Settings
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Methods Status */}
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                    <Card className={hasUpi ? "border-green-200 bg-green-50/50" : ""}>
                        <CardContent className="py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white shadow-sm">
                                    <Smartphone className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-medium">UPI</p>
                                    {hasUpi ? (
                                        <p className="text-sm text-muted-foreground">{dashboard?.reseller?.upiId}</p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Not configured</p>
                                    )}
                                </div>
                            </div>
                            {hasUpi ? (
                                <Badge className="bg-green-500">Active</Badge>
                            ) : (
                                <Link to="/reseller/bank">
                                    <Button variant="ghost" size="sm">
                                        Add <ArrowRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>

                    <Card className={hasBank ? "border-green-200 bg-green-50/50" : ""}>
                        <CardContent className="py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white shadow-sm">
                                    <CreditCard className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-medium">Bank Account</p>
                                    {hasBank ? (
                                        <p className="text-sm text-muted-foreground">
                                            ****{dashboard?.reseller?.bankAccountNumber?.slice(-4)}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Not configured</p>
                                    )}
                                </div>
                            </div>
                            {hasBank ? (
                                <Badge className="bg-green-500">Active</Badge>
                            ) : (
                                <Link to="/reseller/bank">
                                    <Button variant="ghost" size="sm">
                                        Add <ArrowRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Payout History */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Payout History</CardTitle>
                            <CardDescription>All your withdrawal requests</CardDescription>
                        </div>
                        <Button variant="outline" size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                {Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                                        <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                                        <div className="flex-1">
                                            <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                                        </div>
                                        <div className="h-6 bg-slate-200 rounded w-20"></div>
                                    </div>
                                ))}
                            </div>
                        ) : payouts?.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No payouts yet</p>
                                <p className="text-sm">Your withdrawal history will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {payouts?.map((payout) => {
                                    const config = statusConfig[payout.status] || statusConfig.pending;
                                    const Icon = config.icon;

                                    return (
                                        <div
                                            key={payout.id}
                                            className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg"
                                        >
                                            <div className={`p-2 rounded-lg ${config.bg}`}>
                                                <Icon className={`h-5 w-5 ${config.color}`} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium capitalize flex items-center gap-2">
                                                        {payout.payoutMethod === "upi" ? (
                                                            <Smartphone className="h-4 w-4" />
                                                        ) : (
                                                            <CreditCard className="h-4 w-4" />
                                                        )}
                                                        {payout.payoutMethod.toUpperCase()} Withdrawal
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={`${config.bg} ${config.color} border-0`}
                                                    >
                                                        {config.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(payout.createdAt)}
                                                    </span>
                                                    {payout.transactionId && (
                                                        <span>Txn: {payout.transactionId}</span>
                                                    )}
                                                    {payout.failureReason && (
                                                        <span className="text-red-600">{payout.failureReason}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="font-bold text-lg">
                                                    ₹{parseFloat(payout.amount).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Withdraw Dialog */}
                <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Withdraw Funds</DialogTitle>
                            <DialogDescription>
                                Transfer your earnings to your bank or UPI
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Available Balance */}
                            <div className="p-4 bg-slate-100 rounded-lg text-center">
                                <p className="text-sm text-muted-foreground">Available Balance</p>
                                <p className="text-2xl font-bold">₹{balance.toLocaleString()}</p>
                            </div>

                            {/* Amount Input */}
                            <div className="space-y-2">
                                <Label>Withdrawal Amount</Label>
                                <Input
                                    type="number"
                                    placeholder="Enter amount"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min={100}
                                    max={balance}
                                />
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setAmount("500")}>₹500</Button>
                                    <Button variant="outline" size="sm" onClick={() => setAmount("1000")}>₹1000</Button>
                                    <Button variant="outline" size="sm" onClick={() => setAmount(balance.toString())}>Max</Button>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-2">
                                <Label>Withdraw To</Label>
                                <RadioGroup value={method} onValueChange={(v) => setMethod(v as "bank" | "upi")}>
                                    <div className={`flex items-center space-x-3 p-3 rounded-lg border ${method === "upi" ? "border-primary bg-primary/5" : ""}`}>
                                        <RadioGroupItem value="upi" id="upi" disabled={!hasUpi} />
                                        <Label htmlFor="upi" className="flex items-center gap-2 cursor-pointer">
                                            <Smartphone className="h-4 w-4" />
                                            UPI
                                            {hasUpi && <span className="text-xs text-muted-foreground">({dashboard?.reseller?.upiId})</span>}
                                            {!hasUpi && <span className="text-xs text-red-500">Not configured</span>}
                                        </Label>
                                    </div>
                                    <div className={`flex items-center space-x-3 p-3 rounded-lg border ${method === "bank" ? "border-primary bg-primary/5" : ""}`}>
                                        <RadioGroupItem value="bank" id="bank" disabled={!hasBank} />
                                        <Label htmlFor="bank" className="flex items-center gap-2 cursor-pointer">
                                            <CreditCard className="h-4 w-4" />
                                            Bank Transfer
                                            {hasBank && <span className="text-xs text-muted-foreground">(****{dashboard?.reseller?.bankAccountNumber?.slice(-4)})</span>}
                                            {!hasBank && <span className="text-xs text-red-500">Not configured</span>}
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Submit */}
                            <Button
                                className="w-full"
                                onClick={() => withdrawMutation.mutate({
                                    amount: parseFloat(amount),
                                    payoutMethod: method
                                })}
                                disabled={
                                    withdrawMutation.isPending ||
                                    !amount ||
                                    parseFloat(amount) < 100 ||
                                    parseFloat(amount) > balance ||
                                    (method === "upi" && !hasUpi) ||
                                    (method === "bank" && !hasBank)
                                }
                            >
                                {withdrawMutation.isPending ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                ) : (
                                    <Wallet className="mr-2 h-4 w-4" />
                                )}
                                Withdraw ₹{amount || "0"}
                            </Button>

                            <p className="text-xs text-center text-muted-foreground">
                                Withdrawals are typically processed within 24-48 hours
                            </p>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
