import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Trash2, MapPin } from "lucide-react";
import { Address } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Frontend validation schema
const addressSchema = z.object({
    label: z.string().min(1, "Label is required (e.g., Home)"),
    fullName: z.string().min(2, "Full Name is required"),
    addressLine1: z.string().min(5, "Address is required"),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    zipCode: z.string().min(3, "Zip Code is required"),
    country: z.string().min(2, "Country is required"),
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface AddressBookProps {
    onSelect?: (address: Address) => void;
    selectedId?: number;
}

export function AddressBook({ onSelect, selectedId }: AddressBookProps) {
    const [isAdding, setIsAdding] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: addresses, isLoading } = useQuery<Address[]>({
        queryKey: ["/api/user/addresses"],
    });

    const createAddress = useMutation({
        mutationFn: async (data: AddressFormValues) => {
            const res = await apiRequest("POST", "/api/user/addresses", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/user/addresses"] });
            setIsAdding(false);
            toast({ title: "Address added successfully" });
        },
        onError: () => {
            toast({ title: "Failed to add address", variant: "destructive" });
        },
    });

    const deleteAddress = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/user/addresses/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/user/addresses"] });
            toast({ title: "Address deleted" });
        },
    });

    const form = useForm<AddressFormValues>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            label: "Home",
            fullName: "",
            addressLine1: "",
            city: "",
            state: "",
            zipCode: "",
            country: "",
        },
    });

    const onSubmit = (data: AddressFormValues) => {
        createAddress.mutate(data);
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (isAdding) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Add New Address</CardTitle>
                    <CardDescription>Enter your shipping details below.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="label"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Label (e.g. Home)</FormLabel>
                                            <FormControl><Input placeholder="Home" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="fullName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="addressLine1"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address Line 1</FormLabel>
                                        <FormControl><Input placeholder="123 Main St" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl><Input placeholder="New York" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>State</FormLabel>
                                            <FormControl><Input placeholder="NY" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="zipCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Zip Code</FormLabel>
                                            <FormControl><Input placeholder="10001" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Country</FormLabel>
                                            <FormControl><Input placeholder="United States" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" type="button" onClick={() => setIsAdding(false)}>Cancel</Button>
                                <Button type="submit" disabled={createAddress.isPending}>
                                    {createAddress.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Address
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Saved Addresses</h3>
                <Button size="sm" onClick={() => setIsAdding(true)} variant="outline">
                    <Plus className="w-4 h-4 mr-2" /> Add New
                </Button>
            </div>

            {addresses && addresses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No addresses saved yet.</p>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                {addresses?.map((addr) => (
                    <div
                        key={addr.id}
                        className={`p-4 rounded-xl border transition-all ${selectedId === addr.id
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:border-primary/50"
                            } ${onSelect ? "cursor-pointer" : ""}`}
                        onClick={() => onSelect?.(addr)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-medium bg-accent/10 text-accent text-xs px-2 py-1 rounded-full">
                                {addr.label}
                            </span>
                            {!onSelect && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => { e.stopPropagation(); deleteAddress.mutate(addr.id); }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                        <p className="font-semibold">{addr.fullName}</p>
                        <p className="text-sm text-muted-foreground">{addr.addressLine1}</p>
                        <p className="text-sm text-muted-foreground">
                            {addr.city}, {addr.state} {addr.zipCode}
                        </p>
                        <p className="text-sm text-muted-foreground">{addr.country}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
