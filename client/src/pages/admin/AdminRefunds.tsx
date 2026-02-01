import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Eye } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

export default function AdminRefunds() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedRefund, setSelectedRefund] = useState<any>(null);
    const [adminNote, setAdminNote] = useState("");
    const [statusToUpdate, setStatusToUpdate] = useState<string>("");

    const { data: refunds, isLoading } = useQuery({
        queryKey: ["/api/admin/refunds"],
        queryFn: async () => {
            const res = await fetch("/api/admin/refunds");
            if (!res.ok) throw new Error("Failed to fetch refunds");
            return res.json();
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, note }: { id: number, status: string, note: string }) => {
            const res = await apiRequest("PATCH", `/api/admin/refunds/${id}/status`, {
                status,
                adminNote: note
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/refunds"] });
            toast({
                title: "Status Updated",
                description: "Refund status has been updated successfully",
            });
            setSelectedRefund(null);
            setAdminNote("");
            setStatusToUpdate("");
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to update refund status",
                variant: "destructive",
            });
        }
    });

    const handleUpdate = (refund: any, status: string) => {
        setStatusToUpdate(status);
        setSelectedRefund(refund);
        setAdminNote(refund.adminNote || "");
    };

    const confirmUpdate = () => {
        if (!selectedRefund || !statusToUpdate) return;
        updateStatusMutation.mutate({
            id: selectedRefund.id,
            status: statusToUpdate,
            note: adminNote
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "bg-yellow-100 text-yellow-800";
            case "approved": return "bg-green-100 text-green-800";
            case "rejected": return "bg-red-100 text-red-800";
            case "processing": return "bg-blue-100 text-blue-800";
            case "completed": return "bg-green-100 text-green-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8" /></div>;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Refund Requests</h2>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Order ID</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {refunds?.map((refund: any) => (
                            <TableRow key={refund.id}>
                                <TableCell className="font-medium">#{refund.id}</TableCell>
                                <TableCell>#{refund.order.id}</TableCell>
                                <TableCell>{refund.user.email}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>{refund.reason}</span>
                                        {refund.description && (
                                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{refund.description}</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>₹{refund.amount}</TableCell>
                                <TableCell>
                                    <Badge className={getStatusColor(refund.status)} variant="outline">
                                        {refund.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{new Date(refund.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        {refund.status === "pending" && (
                                            <>
                                                <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleUpdate(refund, "approved")}>
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleUpdate(refund, "rejected")}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                        {refund.status !== "pending" && (
                                            <Button size="sm" variant="ghost" onClick={() => handleUpdate(refund, refund.status)}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {refunds?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    No refund requests found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!selectedRefund} onOpenChange={(open) => !open && setSelectedRefund(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Refund Status</DialogTitle>
                        <DialogDescription>
                            Reviewing refund request #{selectedRefund?.id} for Order #{selectedRefund?.orderId}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Current Status</Label>
                            <Select value={statusToUpdate} onValueChange={setStatusToUpdate}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Reason provided by user</Label>
                            <div className="p-3 bg-muted rounded-md text-sm">
                                <p className="font-medium">{selectedRefund?.reason}</p>
                                <p className="text-muted-foreground">{selectedRefund?.description}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="note">Admin Note</Label>
                            <Textarea
                                id="note"
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                placeholder="Add a note to the user..."
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedRefund(null)}>Cancel</Button>
                        <Button onClick={confirmUpdate} disabled={updateStatusMutation.isPending}>
                            {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
