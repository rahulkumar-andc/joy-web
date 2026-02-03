import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SellerLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Store, Save, Loader2, Image as ImageIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const profileSchema = z.object({
    shopName: z.string().min(3, "Shop name must be at least 3 characters"),
    description: z.string().optional(),
    logo: z.string().optional(),
    banner: z.string().optional(),
    bankName: z.string().min(1, "Bank name is required"),
    accountNumber: z.string().min(1, "Account number is required"),
    ifscCode: z.string().min(1, "IFSC code is required"),
    gstin: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SellerProfilePage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);

    const { data: profile, isLoading } = useQuery({
        queryKey: ["seller-profile"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/seller/profile");
            return res.json();
        }
    });

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            shopName: "",
            description: "",
            logo: "",
            banner: "",
            bankName: "",
            accountNumber: "",
            ifscCode: "",
            gstin: "",
        },
        values: profile ? {
            shopName: profile.shopName || "",
            description: profile.description || "",
            logo: profile.logo || "",
            banner: profile.banner || "",
            bankName: profile.bankDetails?.bankName || "",
            accountNumber: profile.bankDetails?.accountNumber || "",
            ifscCode: profile.bankDetails?.ifscCode || "",
            gstin: profile.gstin || "",
        } : undefined
    });

    const updateProfileMutation = useMutation({
        mutationFn: async (values: ProfileFormValues) => {
            const res = await apiRequest("PATCH", "/api/seller/profile", values);
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Profile updated",
                description: "Your shop settings have been saved successfully.",
            });
            setIsEditing(false);
            queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
            queryClient.invalidateQueries({ queryKey: ["seller-dashboard"] });
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to update profile",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    function onSubmit(values: ProfileFormValues) {
        updateProfileMutation.mutate(values);
    }

    if (isLoading) {
        return (
            <SellerLayout title="Shop Settings" subtitle="Manage your seller profile">
                <div className="h-[50vh] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </SellerLayout>
        );
    }

    return (
        <SellerLayout
            title="Shop Settings"
            subtitle="Manage your shop profile and banking details"
        >
            <div className="max-w-4xl mx-auto">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                        {/* Shop Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Store className="h-5 w-5" />
                                    Shop Information
                                </CardTitle>
                                <CardDescription>
                                    Public information about your shop visible to customers
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="shopName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Shop Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} disabled={!isEditing} />
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
                                                    {...field}
                                                    disabled={!isEditing}
                                                    className="min-h-[100px]"
                                                    placeholder="Tell customers about your shop..."
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        {/* Bank Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <div className="h-5 w-5 text-green-600">₹</div>
                                    Bank Details
                                </CardTitle>
                                <CardDescription>
                                    Where you'll receive your payouts (Confidential)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="bankName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bank Name</FormLabel>
                                                <FormControl>
                                                    <Input {...field} disabled={!isEditing} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="ifscCode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>IFSC Code</FormLabel>
                                                <FormControl>
                                                    <Input {...field} disabled={!isEditing} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="accountNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Account Number</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="password" disabled={!isEditing} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="gstin"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>GSTIN (Optional)</FormLabel>
                                            <FormControl>
                                                <Input {...field} disabled={!isEditing} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-4">
                            {isEditing ? (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            form.reset();
                                            setIsEditing(false);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={updateProfileMutation.isPending}
                                    >
                                        {updateProfileMutation.isPending && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Changes
                                    </Button>
                                </>
                            ) : (
                                <Button type="button" onClick={() => setIsEditing(true)}>
                                    Edit Settings
                                </Button>
                            )}
                        </div>
                    </form>
                </Form>
            </div>
        </SellerLayout>
    );
}
