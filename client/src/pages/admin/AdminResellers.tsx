import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, Ban, AlertTriangle, ShieldCheck } from "lucide-react";
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
import { AdminLayout } from "@/components/layout";

export default function AdminResellers() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [suspendReason, setSuspendReason] = useState("");
    const [selectedResellerId, setSelectedResellerId] = useState<number | null>(null);

    // Fetch resellers
    const { data: resellers, isLoading } = useQuery({
        queryKey: ["admin-resellers"],
        queryFn: async () => {
            const res = await api.get("/api/admin/resellers");
            return res.data;
        }
    });

    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.post(`/api/admin/resellers/${id}/approve`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-resellers"] });
            toast({ title: "Success", description: "Reseller approved successfully." });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to approve reseller.", variant: "destructive" });
        }
    });

    // Suspend mutation
    const suspendMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: number, reason: string }) => {
            await api.post(`/api/admin/resellers/${id}/suspend`, { reason });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-resellers"] });
            setSuspendReason("");
            setSelectedResellerId(null);
            toast({ title: "Success", description: "Reseller suspended." });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to suspend reseller.", variant: "destructive" });
        }
    });

    // Clear flag mutation
    const clearFlagMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.post(`/api/admin/resellers/${id}/clear-flag`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-resellers"] });
            toast({ title: "Success", description: "Fraud flag cleared." });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to clear flag.", variant: "destructive" });
        }
    });

    if (isLoading) {
        return (
            <AdminLayout title="Resellers" subtitle="Manage reseller accounts and approvals">
                <div className="text-center py-8">Loading resellers...</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout title="Resellers" subtitle="Manage reseller accounts and approvals">
            <div className="space-y-6">
                <h2 className="text-2xl font-bold tracking-tight">Reseller Management</h2>

                <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Reseller Code</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Tier</TableHead>
                                <TableHead>Earnings</TableHead>
                                <TableHead>Risk Score</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {resellers?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No resellers found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                resellers?.map((reseller: any) => (
                                    <TableRow key={reseller.id}>
                                        <TableCell className="font-mono">{reseller.resellerCode}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                reseller.status === "active" ? "default" :
                                                    reseller.status === "pending" ? "secondary" :
                                                        "destructive"
                                            }>
                                                {reseller.status}
                                            </Badge>
                                            {reseller.isFlagged && (
                                                <Badge variant="destructive" className="ml-2">
                                                    <AlertTriangle className="w-3 h-3 mr-1" /> Flagged
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="capitalize">{reseller.tier}</TableCell>
                                        <TableCell>₹{parseFloat(reseller.totalEarnings).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <span className={reseller.riskScore > 50 ? "text-red-600 font-bold" : "text-green-600"}>
                                                {reseller.riskScore}
                                            </span>
                                        </TableCell>
                                        <TableCell>{format(new Date(reseller.createdAt), "MMM d, yyyy")}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {reseller.status === "pending" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    onClick={() => approveMutation.mutate(reseller.id)}
                                                    disabled={approveMutation.isPending}
                                                >
                                                    <Check className="w-4 h-4 mr-1" /> Approve
                                                </Button>
                                            )}

                                            {reseller.isFlagged && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => clearFlagMutation.mutate(reseller.id)}
                                                    disabled={clearFlagMutation.isPending}
                                                >
                                                    <ShieldCheck className="w-4 h-4 mr-1" /> Clear Flag
                                                </Button>
                                            )}

                                            {reseller.status !== "suspended" && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => setSelectedResellerId(reseller.id)}
                                                        >
                                                            <Ban className="w-4 h-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Suspend Reseller</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="py-4">
                                                            <Label htmlFor="reason">Suspension Reason</Label>
                                                            <Input
                                                                id="reason"
                                                                placeholder="e.g. Violation of terms"
                                                                value={suspendReason}
                                                                onChange={(e) => setSuspendReason(e.target.value)}
                                                            />
                                                        </div>
                                                        <DialogFooter>
                                                            <Button
                                                                variant="destructive"
                                                                onClick={() => {
                                                                    if (selectedResellerId && suspendReason) {
                                                                        suspendMutation.mutate({
                                                                            id: selectedResellerId,
                                                                            reason: suspendReason
                                                                        });
                                                                    }
                                                                }}
                                                                disabled={suspendMutation.isPending || !suspendReason}
                                                            >
                                                                Confirm Suspension
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AdminLayout>
    );
}
