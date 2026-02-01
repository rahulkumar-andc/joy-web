import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
    CreditCard,
    Smartphone,
    ChevronLeft,
    CheckCircle,
    AlertCircle,
    Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ResellerProfile {
    id: number;
    upiId?: string;
    bankAccountNumber?: string;
    bankIfscCode?: string;
    bankAccountHolder?: string;
}

export default function ResellerBankSettingsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Form states
    const [upiId, setUpiId] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [ifscCode, setIfscCode] = useState("");
    const [accountHolder, setAccountHolder] = useState("");

    const { data: profile, isLoading } = useQuery<ResellerProfile>({
        queryKey: ["/api/reseller/profile"],
        meta: {
            onSuccess: (data: ResellerProfile) => {
                setUpiId(data.upiId || "");
                setAccountNumber(data.bankAccountNumber || "");
                setIfscCode(data.bankIfscCode || "");
                setAccountHolder(data.bankAccountHolder || "");
            },
        },
    });

    // Update UPI
    const updateUpiMutation = useMutation({
        mutationFn: async (data: { upiId: string }) => {
            const res = await apiRequest("PATCH", "/api/reseller/upi", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/reseller/profile"] });
            toast({
                title: "UPI Updated",
                description: "Your UPI ID has been saved",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update UPI",
                variant: "destructive",
            });
        },
    });

    // Update Bank
    const updateBankMutation = useMutation({
        mutationFn: async (data: {
            bankAccountNumber: string;
            bankIfscCode: string;
            bankAccountHolder: string;
        }) => {
            const res = await apiRequest("PATCH", "/api/reseller/bank", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/reseller/profile"] });
            toast({
                title: "Bank Details Updated",
                description: "Your bank account has been saved",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update bank details",
                variant: "destructive",
            });
        },
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
            <div className="container mx-auto px-4 max-w-2xl">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Payment Settings</h1>
                        <p className="text-muted-foreground">
                            Manage your payout methods
                        </p>
                    </div>
                    <Link to="/reseller/dashboard">
                        <Button variant="outline">
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                </div>

                {/* Security Notice */}
                <Card className="mb-6 border-blue-200 bg-blue-50/50">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-blue-600" />
                            <p className="text-sm text-blue-800">
                                Your payment details are encrypted and securely stored. We never share your banking information.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="upi" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upi" className="gap-2">
                            <Smartphone className="h-4 w-4" />
                            UPI
                        </TabsTrigger>
                        <TabsTrigger value="bank" className="gap-2">
                            <CreditCard className="h-4 w-4" />
                            Bank Account
                        </TabsTrigger>
                    </TabsList>

                    {/* UPI Tab */}
                    <TabsContent value="upi">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Smartphone className="h-5 w-5" />
                                    UPI ID
                                </CardTitle>
                                <CardDescription>
                                    Receive payouts instantly via UPI
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Current Status */}
                                {profile?.upiId && (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                        <div className="flex-1">
                                            <p className="font-medium text-green-800">Active UPI</p>
                                            <p className="text-sm text-green-600">{profile.upiId}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>UPI ID</Label>
                                    <Input
                                        placeholder="yourname@upi"
                                        value={upiId}
                                        onChange={(e) => setUpiId(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Enter your UPI ID (e.g., 9876543210@paytm, name@okaxis)
                                    </p>
                                </div>

                                <Button
                                    onClick={() => updateUpiMutation.mutate({ upiId })}
                                    disabled={updateUpiMutation.isPending || !upiId}
                                    className="w-full"
                                >
                                    {updateUpiMutation.isPending ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    ) : null}
                                    {profile?.upiId ? "Update UPI ID" : "Add UPI ID"}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Bank Tab */}
                    <TabsContent value="bank">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Bank Account
                                </CardTitle>
                                <CardDescription>
                                    Receive payouts via NEFT/IMPS bank transfer
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Current Status */}
                                {profile?.bankAccountNumber && (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                        <div className="flex-1">
                                            <p className="font-medium text-green-800">Active Bank Account</p>
                                            <p className="text-sm text-green-600">
                                                ****{profile.bankAccountNumber.slice(-4)} ({profile.bankIfscCode})
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label>Account Holder Name</Label>
                                    <Input
                                        placeholder="As per bank records"
                                        value={accountHolder}
                                        onChange={(e) => setAccountHolder(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Account Number</Label>
                                    <Input
                                        placeholder="Enter account number"
                                        value={accountNumber}
                                        onChange={(e) => setAccountNumber(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>IFSC Code</Label>
                                    <Input
                                        placeholder="e.g., SBIN0001234"
                                        value={ifscCode}
                                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                                        maxLength={11}
                                    />
                                </div>

                                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                                        <div className="text-sm text-yellow-800">
                                            <p className="font-medium">Verification Required</p>
                                            <p>A small test deposit will be made to verify your account. This may take 1-2 business days.</p>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => updateBankMutation.mutate({
                                        bankAccountNumber: accountNumber,
                                        bankIfscCode: ifscCode,
                                        bankAccountHolder: accountHolder,
                                    })}
                                    disabled={updateBankMutation.isPending || !accountNumber || !ifscCode || !accountHolder}
                                    className="w-full"
                                >
                                    {updateBankMutation.isPending ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    ) : null}
                                    {profile?.bankAccountNumber ? "Update Bank Account" : "Add Bank Account"}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* FAQ */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div>
                            <p className="font-medium">How long do payouts take?</p>
                            <p className="text-muted-foreground">UPI payouts are instant. Bank transfers take 24-48 hours.</p>
                        </div>
                        <div>
                            <p className="font-medium">What is the minimum payout?</p>
                            <p className="text-muted-foreground">Minimum withdrawal is ₹100.</p>
                        </div>
                        <div>
                            <p className="font-medium">Are there any fees?</p>
                            <p className="text-muted-foreground">No fees for UPI. Bank transfers above ₹5000 are free.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
