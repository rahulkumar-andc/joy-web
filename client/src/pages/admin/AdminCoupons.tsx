import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { format } from "date-fns";
import { AdminLayout } from "@/components/layout";

// Schema for creating a coupon
const createCouponSchema = z.object({
    code: z.string().min(3, "Code must be at least 3 characters"),
    discountType: z.enum(["percentage", "fixed"]),
    discountValue: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Must be a positive number"),
    minOrderAmount: z.string().default("0"),
    maxUsage: z.string().optional(),
    maxUsagePerUser: z.string().default("1"),
    expiresAt: z.string().optional(),
    isActive: z.boolean().default(true),
});

type CreateCouponForm = z.infer<typeof createCouponSchema>;

export default function AdminCoupons() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    // Fetch coupons
    const { data: coupons, isLoading } = useQuery({
        queryKey: ["admin-coupons"],
        queryFn: async () => {
            const res = await api.get("/api/coupons");
            return res.data;
        },
    });

    const form = useForm<CreateCouponForm>({
        resolver: zodResolver(createCouponSchema),
        defaultValues: {
            code: "",
            discountType: "percentage",
            discountValue: "",
            minOrderAmount: "0",
            maxUsage: "",
            maxUsagePerUser: "1",
            isActive: true,
        },
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: CreateCouponForm) => {
            const payload = {
                ...data,
                maxUsage: data.maxUsage ? parseInt(data.maxUsage) : null,
                maxUsagePerUser: parseInt(data.maxUsagePerUser),
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
            };
            await api.post("/api/coupons", payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
            toast({ title: "Coupon created successfully" });
            setIsOpen(false);
            form.reset();
        },
        onError: (error: any) => {
            toast({ title: "Failed to create coupon", description: error.message, variant: "destructive" });
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/api/coupons/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
            toast({ title: "Coupon deleted" });
        },
        onError: () => {
            toast({ title: "Failed to delete coupon", variant: "destructive" });
        }
    });

    const onSubmit = (data: CreateCouponForm) => {
        createMutation.mutate(data);
    };

    if (isLoading) return (
        <AdminLayout title="Coupons" subtitle="Manage discount codes and promotions">
            <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>
        </AdminLayout>
    );

    return (
        <AdminLayout title="Coupons" subtitle="Manage discount codes and promotions">
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold tracking-tight">Coupons</h2>
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4" /> Create Coupon</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Create New Coupon</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="code" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Coupon Code</FormLabel>
                                                <FormControl><Input {...field} placeholder="e.g. SUMMER2025" style={{ textTransform: "uppercase" }} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="isActive" render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-8">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Active</FormLabel>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                            </FormItem>
                                        )} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="discountType" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="discountValue" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Value</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="minOrderAmount" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Min Order Amount</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="maxUsagePerUser" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Max Uses Per User</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="maxUsage" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Global Usage Limit (Optional)</FormLabel>
                                                <FormControl><Input type="number" {...field} placeholder="Unlimited" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="expiresAt" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Expiry Date (Optional)</FormLabel>
                                                <FormControl><Input type="datetime-local" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                                        {createMutation.isPending ? "Creating..." : "Create Coupon"}
                                    </Button>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead>Min Order</TableHead>
                                <TableHead>Usage (Total/User)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {coupons?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        No coupons found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                coupons?.map((coupon: any) => (
                                    <TableRow key={coupon.id}>
                                        <TableCell className="font-mono font-bold text-primary">{coupon.code}</TableCell>
                                        <TableCell>
                                            {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                                        </TableCell>
                                        <TableCell>₹{coupon.minOrderAmount}</TableCell>
                                        <TableCell>
                                            {coupon.usageCount} / {coupon.maxUsage || "∞"} (Max/User: {coupon.maxUsagePerUser})
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs ${coupon.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {coupon.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {coupon.expiresAt ? format(new Date(coupon.expiresAt), "MMM d, yyyy") : "Never"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    if (confirm("Are you sure you want to delete this coupon?")) {
                                                        deleteMutation.mutate(coupon.id);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
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
