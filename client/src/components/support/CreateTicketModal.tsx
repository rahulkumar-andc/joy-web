import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTicket } from "@/hooks/use-support";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const SUPPORT_ISSUE_TYPES = [
    { value: "tracking_query", label: "Where is my order?" },
    { value: "address_change", label: "Change delivery address" },
    { value: "cancel_request", label: "Cancel order" },
    { value: "delivery_late", label: "Delivery is delayed" },
    { value: "damaged_product", label: "Product received damaged" },
    { value: "wrong_item", label: "Received wrong item" },
    { value: "refund_issue", label: "Refund not received" },
    { value: "payment_deducted", label: "Payment deducted but order failed" },
    { value: "other", label: "Other issue" },
];

const formSchema = z.object({
    issueType: z.string().min(1, "Please select an issue type"),
    subject: z.string().min(5, "Subject must be at least 5 characters"),
    description: z.string().min(20, "Please provide more detail"),
    orderId: z.number().optional(),
});

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultOrderId?: number;
}

export function CreateTicketModal({ open, onOpenChange, defaultOrderId }: Props) {
    const createTicket = useCreateTicket();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            issueType: "",
            subject: "",
            description: "",
            orderId: defaultOrderId,
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        createTicket.mutate(values, {
            onSuccess: () => {
                onOpenChange(false);
                form.reset();
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Raise a Support Ticket</DialogTitle>
                    <DialogDescription>
                        Tell us about your issue and we'll help you resolve it.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <FormField
                            control={form.control}
                            name="issueType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Issue Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select issue type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {SUPPORT_ISSUE_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Brief summary of issue" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Please provide details..."
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={createTicket.isPending}>
                                {createTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Ticket
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
