import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { format } from "date-fns";
import api from "@/lib/api";

// This is a placeholder as the exact API endpoint for ALL payouts needs to be implemented or we reuse reseller specific one
// Assuming we have or will implement /api/admin/payouts
// For now, we'll use a mocked query if the endpoint doesn't exist, but based on routes, it seems we might need to add it or use the reseller one.
// Checking routes... verify existing routes. 
// Wait, the routes file had /api/admin/payouts/:id/complete but not a list all endpoint?
// Let's assume we need to add GET /api/admin/payouts to reseller.controller.ts later if it's missing.
// For now, I'll code the frontend expecting the endpoint.

export default function AdminPayouts() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [actionReason, setActionReason] = useState("");
    const [selectedPayoutId, setSelectedPayoutId] = useState<number | null>(null);

    // Fetch payouts
    const { data: payoutsData, isLoading } = useQuery({
        queryKey: ["admin-payouts"],
        queryFn: async () => {
            const res = await api.get("/api/admin/payouts");
            // API returns { payouts: [...], total, page, limit, totalPages }
            return res.data;
        },
        retry: false
    });

    // Extract payouts array from response
    const payouts = payoutsData?.payouts || [];

    // Complete mutation
    const completeMutation = useMutation({
        mutationFn: async ({ id, transactionId }: { id: number, transactionId: string }) => {
            await api.post(`/api/admin/payouts/${id}/complete`, { transactionId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
            setActionReason("");
            setSelectedPayoutId(null);
            toast({ title: "Success", description: "Payout marked as completed." });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to complete payout.", variant: "destructive" });
        }
    });

    // Fail mutation
    const failMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: number, reason: string }) => {
            await api.post(`/api/admin/payouts/${id}/fail`, { reason });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
            setActionReason("");
            setSelectedPayoutId(null);
            toast({ title: "Success", description: "Payout marked as failed." });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to mark payout as failed.", variant: "destructive" });
        }
    });

    if (isLoading) {
        return <div className="text-center py-8">Loading payouts...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Payout Requests</h2>

            <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Reseller ID</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payouts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    No payout requests found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            payouts.map((payout: any) => (
                                <TableRow key={payout.id}>
                                    <TableCell>#{payout.id}</TableCell>
                                    <TableCell>#{payout.resellerId}</TableCell>
                                    <TableCell className="font-bold">₹{parseFloat(payout.amount).toFixed(2)}</TableCell>
                                    <TableCell className="uppercase text-xs font-semibold">{payout.payoutMethod}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {payout.payoutMethod === 'bank' ? (
                                            <>
                                                <div>{payout.bankAccountNumber}</div>
                                                <div className="text-xs">{payout.bankIfscCode}</div>
                                            </>
                                        ) : (
                                            <div>{payout.upiId}</div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            payout.status === "completed" ? "default" :
                                                payout.status === "pending" ? "secondary" :
                                                    "destructive"
                                        }>
                                            {payout.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{format(new Date(payout.createdAt), "MMM d, HH:mm")}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {payout.status === "pending" && (
                                            <>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                            onClick={() => setSelectedPayoutId(payout.id)}
                                                        >
                                                            <CheckCircle2 className="w-4 h-4 mr-1" /> Pay
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Complete Payout</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="py-4">
                                                            <Label htmlFor="txnIdx">Transaction Ref ID</Label>
                                                            <Input
                                                                id="txnIdx"
                                                                placeholder="Enter bank/UPI transaction ID"
                                                                value={actionReason}
                                                                onChange={(e) => setActionReason(e.target.value)}
                                                            />
                                                        </div>
                                                        <DialogFooter>
                                                            <Button
                                                                className="bg-green-600 hover:bg-green-700"
                                                                onClick={() => {
                                                                    if (selectedPayoutId && actionReason) {
                                                                        completeMutation.mutate({
                                                                            id: selectedPayoutId,
                                                                            transactionId: actionReason
                                                                        });
                                                                    }
                                                                }}
                                                                disabled={completeMutation.isPending || !actionReason}
                                                            >
                                                                Confirm Payment
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>

                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => {
                                                                setSelectedPayoutId(payout.id);
                                                                setActionReason("");
                                                            }}
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Reject Payout</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="py-4">
                                                            <Label htmlFor="failReason">Rejection Reason</Label>
                                                            <Input
                                                                id="failReason"
                                                                placeholder="e.g. Invalid bank details"
                                                                value={actionReason}
                                                                onChange={(e) => setActionReason(e.target.value)}
                                                            />
                                                        </div>
                                                        <DialogFooter>
                                                            <Button
                                                                variant="destructive"
                                                                onClick={() => {
                                                                    if (selectedPayoutId && actionReason) {
                                                                        failMutation.mutate({
                                                                            id: selectedPayoutId,
                                                                            reason: actionReason
                                                                        });
                                                                    }
                                                                }}
                                                                disabled={failMutation.isPending || !actionReason}
                                                            >
                                                                Confirm Rejection
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
