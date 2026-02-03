import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PremiumHeader } from "@/components/layout";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Store, CheckCircle2 } from "lucide-react";

// Validation schema matching backend
const sellerRegistrationSchema = z.object({
    shopName: z.string().min(3, "Shop name must be at least 3 characters").max(100),
    businessType: z.enum(["individual", "company", "partnership"]),
    description: z.string().max(1000).optional(),
    businessEmail: z.string().email("Invalid email address"),
    businessPhone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
    hasGst: z.boolean().default(false),
    gstNumber: z.string().optional(),
    panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN number"),
    bankAccountNumber: z.string().min(9, "Account number must be at least 9 digits").max(18),
    bankIfscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
    bankAccountName: z.string().min(3).max(100),
    bankName: z.string().optional(),
    pickupAddressLine1: z.string().min(10, "Address must be at least 10 characters"),
    pickupAddressLine2: z.string().optional(),
    pickupCity: z.string().min(2),
    pickupState: z.string().min(2),
    pickupPincode: z.string().regex(/^[1-9][0-9]{5}$/, "Invalid pincode"),
    pickupPhone: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
    pickupLandmark: z.string().optional(),
}).refine((data) => {
    if (data.hasGst && !data.gstNumber) return false;
    if (data.hasGst && data.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.gstNumber)) {
        return false;
    }
    return true;
}, {
    message: "Valid GST number is required when GST is enabled",
    path: ["gstNumber"],
});

type SellerRegistrationData = z.infer<typeof sellerRegistrationSchema>;

export default function SellerRegistrationPage() {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

    const form = useForm<SellerRegistrationData>({
        resolver: zodResolver(sellerRegistrationSchema),
        defaultValues: {
            businessType: "individual",
            hasGst: false,
        },
    });

    const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = form;
    const hasGst = watch("hasGst");

    const registerMutation = useMutation({
        mutationFn: async (data: SellerRegistrationData) => {
            console.log("Submitting registration, cookies:", document.cookie); // Debug
            const res = await apiRequest("POST", "/api/seller/register", data);
            return res.json();
        },
        onSuccess: (_data, variables) => {
            setRegistrationSuccess(true);
            localStorage.setItem("seller_registration_email", variables.businessEmail);
            toast({
                title: "Registration Submitted!",
                description: "Please verify your email to complete registration.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Registration Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const onSubmit = (data: SellerRegistrationData) => {
        registerMutation.mutate(data);
    };

    const nextStep = async () => {
        let fieldsToValidate: (keyof SellerRegistrationData)[] = [];
        if (step === 1) {
            fieldsToValidate = ["shopName", "businessType", "businessEmail", "businessPhone"];
        } else if (step === 2) {
            fieldsToValidate = ["panNumber"];
            if (hasGst) fieldsToValidate.push("gstNumber");
        } else if (step === 3) {
            fieldsToValidate = ["bankAccountName", "bankAccountNumber", "bankIfscCode"];
        }

        const isValid = await trigger(fieldsToValidate);
        if (isValid) {
            setStep(s => Math.min(s + 1, 4));
        }
    };

    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    if (registrationSuccess) {
        return (
            <div className="min-h-screen bg-background">
                <PremiumHeader />
                <main className="container mx-auto px-4 py-16">
                    <Card className="max-w-lg mx-auto text-center">
                        <CardHeader>
                            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
                            <CardTitle className="text-2xl">Registration Submitted!</CardTitle>
                            <CardDescription>
                                We've sent a verification code to your email. Please verify to complete your registration.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                After verification, our team will review your application within 24-48 hours.
                            </p>
                            <Button onClick={() => navigate("/seller/verify")}>
                                Verify Email
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <PremiumHeader />
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-8">
                        <Store className="h-12 w-12 mx-auto text-primary mb-4" />
                        <h1 className="text-3xl font-bold">Become a Seller</h1>
                        <p className="text-muted-foreground mt-2">
                            Start selling on our marketplace today
                        </p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex justify-between mb-8">
                        {["Business Info", "KYC Details", "Bank Details", "Pickup Address"].map((label, i) => (
                            <div key={i} className="flex-1 text-center">
                                <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center text-sm font-medium ${step > i + 1 ? "bg-green-500 text-white" :
                                    step === i + 1 ? "bg-primary text-primary-foreground" :
                                        "bg-muted text-muted-foreground"
                                    }`}>
                                    {step > i + 1 ? "✓" : i + 1}
                                </div>
                                <p className="text-xs mt-1 text-muted-foreground">{label}</p>
                            </div>
                        ))}
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {step === 1 && "Business Information"}
                                {step === 2 && "KYC Verification"}
                                {step === 3 && "Bank Details"}
                                {step === 4 && "Pickup Address"}
                            </CardTitle>
                            <CardDescription>
                                {step === 1 && "Enter your business details"}
                                {step === 2 && "Provide your PAN and GST information"}
                                {step === 3 && "Enter your bank account for payouts"}
                                {step === 4 && "Where should we pickup your orders from?"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit, (errors) => {
                                console.error("Validation Errors:", errors);
                                const errorFields = Object.keys(errors);
                                if (errorFields.length > 0) {
                                    toast({
                                        title: "Validation Error",
                                        description: `Please check fields: ${errorFields.join(", ")}. You may need to go back to previous steps.`,
                                        variant: "destructive",
                                    });
                                }
                            })} className="space-y-4">
                                {/* Step 1: Business Info */}
                                {step === 1 && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="shopName">Shop Name *</Label>
                                            <Input
                                                id="shopName"
                                                placeholder="My Awesome Store"
                                                {...register("shopName")}
                                            />
                                            {errors.shopName && (
                                                <p className="text-sm text-red-500">{errors.shopName.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="businessType">Business Type *</Label>
                                            <Select
                                                value={watch("businessType")}
                                                onValueChange={(v) => setValue("businessType", v as any)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select business type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="individual">Individual</SelectItem>
                                                    <SelectItem value="company">Company</SelectItem>
                                                    <SelectItem value="partnership">Partnership</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="description">Shop Description</Label>
                                            <Textarea
                                                id="description"
                                                placeholder="Tell customers about your store..."
                                                {...register("description")}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="businessEmail">Business Email *</Label>
                                                <Input
                                                    id="businessEmail"
                                                    type="email"
                                                    placeholder="business@example.com"
                                                    {...register("businessEmail")}
                                                />
                                                {errors.businessEmail && (
                                                    <p className="text-sm text-red-500">{errors.businessEmail.message}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="businessPhone">Business Phone *</Label>
                                                <Input
                                                    id="businessPhone"
                                                    placeholder="9876543210"
                                                    {...register("businessPhone")}
                                                />
                                                {errors.businessPhone && (
                                                    <p className="text-sm text-red-500">{errors.businessPhone.message}</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Step 2: KYC Details */}
                                {step === 2 && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="panNumber">PAN Number *</Label>
                                            <Input
                                                id="panNumber"
                                                placeholder="ABCDE1234F"
                                                className="uppercase"
                                                {...register("panNumber")}
                                            />
                                            {errors.panNumber && (
                                                <p className="text-sm text-red-500">{errors.panNumber.message}</p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between p-4 border rounded-lg">
                                            <div>
                                                <Label>Do you have GST registration?</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Required if annual turnover exceeds ₹40 lakhs
                                                </p>
                                            </div>
                                            <Switch
                                                checked={hasGst}
                                                onCheckedChange={(v) => setValue("hasGst", v)}
                                            />
                                        </div>

                                        {hasGst && (
                                            <div className="space-y-2">
                                                <Label htmlFor="gstNumber">GST Number *</Label>
                                                <Input
                                                    id="gstNumber"
                                                    placeholder="22AAAAA0000A1Z5"
                                                    className="uppercase"
                                                    {...register("gstNumber")}
                                                />
                                                {errors.gstNumber && (
                                                    <p className="text-sm text-red-500">{errors.gstNumber.message}</p>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Step 3: Bank Details */}
                                {step === 3 && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="bankAccountName">Account Holder Name *</Label>
                                            <Input
                                                id="bankAccountName"
                                                placeholder="As per bank records"
                                                {...register("bankAccountName")}
                                            />
                                            {errors.bankAccountName && (
                                                <p className="text-sm text-red-500">{errors.bankAccountName.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="bankAccountNumber">Account Number *</Label>
                                            <Input
                                                id="bankAccountNumber"
                                                placeholder="1234567890"
                                                {...register("bankAccountNumber")}
                                            />
                                            {errors.bankAccountNumber && (
                                                <p className="text-sm text-red-500">{errors.bankAccountNumber.message}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="bankIfscCode">IFSC Code *</Label>
                                                <Input
                                                    id="bankIfscCode"
                                                    placeholder="HDFC0001234"
                                                    className="uppercase"
                                                    {...register("bankIfscCode")}
                                                />
                                                {errors.bankIfscCode && (
                                                    <p className="text-sm text-red-500">{errors.bankIfscCode.message}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="bankName">Bank Name</Label>
                                                <Input
                                                    id="bankName"
                                                    placeholder="HDFC Bank"
                                                    {...register("bankName")}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Step 4: Pickup Address */}
                                {step === 4 && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="pickupAddressLine1">Address Line 1 *</Label>
                                            <Input
                                                id="pickupAddressLine1"
                                                placeholder="Building, Street, Area"
                                                {...register("pickupAddressLine1")}
                                            />
                                            {errors.pickupAddressLine1 && (
                                                <p className="text-sm text-red-500">{errors.pickupAddressLine1.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="pickupAddressLine2">Address Line 2</Label>
                                            <Input
                                                id="pickupAddressLine2"
                                                placeholder="Landmark (optional)"
                                                {...register("pickupAddressLine2")}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="pickupCity">City *</Label>
                                                <Input
                                                    id="pickupCity"
                                                    placeholder="Mumbai"
                                                    {...register("pickupCity")}
                                                />
                                                {errors.pickupCity && (
                                                    <p className="text-sm text-red-500">{errors.pickupCity.message}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="pickupState">State *</Label>
                                                <Input
                                                    id="pickupState"
                                                    placeholder="Maharashtra"
                                                    {...register("pickupState")}
                                                />
                                                {errors.pickupState && (
                                                    <p className="text-sm text-red-500">{errors.pickupState.message}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="pickupPincode">Pincode *</Label>
                                                <Input
                                                    id="pickupPincode"
                                                    placeholder="400001"
                                                    {...register("pickupPincode")}
                                                />
                                                {errors.pickupPincode && (
                                                    <p className="text-sm text-red-500">{errors.pickupPincode.message}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="pickupPhone">Pickup Phone *</Label>
                                                <Input
                                                    id="pickupPhone"
                                                    placeholder="9876543210"
                                                    {...register("pickupPhone")}
                                                />
                                                {errors.pickupPhone && (
                                                    <p className="text-sm text-red-500">{errors.pickupPhone.message}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="pickupLandmark">Landmark</Label>
                                            <Input
                                                id="pickupLandmark"
                                                placeholder="Near..."
                                                {...register("pickupLandmark")}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Navigation Buttons */}
                                <div className="flex justify-between pt-4">
                                    {step > 1 ? (
                                        <Button type="button" variant="outline" onClick={prevStep}>
                                            Previous
                                        </Button>
                                    ) : (
                                        <div />
                                    )}

                                    {step < 4 ? (
                                        <Button type="button" onClick={nextStep}>
                                            Next
                                        </Button>
                                    ) : (
                                        <Button type="submit" disabled={registerMutation.isPending}>
                                            {registerMutation.isPending && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            )}
                                            Submit Application
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
