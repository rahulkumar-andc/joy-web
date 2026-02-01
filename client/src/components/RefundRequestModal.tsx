import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface RefundRequestModalProps {
    orderId: number;
    trigger?: React.ReactNode;
}

export function RefundRequestModal({ orderId, trigger }: RefundRequestModalProps) {
    const [reason, setReason] = useState<string>("");
    const [description, setDescription] = useState("");
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", `/api/orders/${orderId}/refund`, data);
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Refund Requested",
                description: "Your refund request has been submitted successfully.",
            });
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/refunds"] });
            queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to submit refund request",
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) {
            toast({
                title: "Validation Error",
                description: "Please select a reason for the refund.",
                variant: "destructive",
            });
            return;
        }
        mutation.mutate({
            reason,
            description,
            images: [], // TODO: Add image upload support later
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline">Request Refund</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Request Refund</DialogTitle>
                    <DialogDescription>
                        Submit a refund request for Order #{orderId}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Refund</Label>
                        <Select onValueChange={setReason} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="defective">Defective/Damaged Item</SelectItem>
                                <SelectItem value="wrong_item">Received Wrong Item</SelectItem>
                                <SelectItem value="size_issue">Size Doesn't Fit</SelectItem>
                                <SelectItem value="quality_issue">Quality Not As Expected</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Please provide more details..."
                        />
                    </div>
                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? "Submitting..." : "Submit Request"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
