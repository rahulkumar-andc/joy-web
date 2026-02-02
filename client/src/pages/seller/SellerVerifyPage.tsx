import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";

export default function SellerVerifyPage() {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const [otp, setOtp] = useState("");
    const [email, setEmail] = useState("");
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        // Try to get email from local storage if preserved during registration flow
        // Or we could ask user to re-enter. For better UX, we'll ask user to confirm email.
        const storedEmail = localStorage.getItem("seller_registration_email");
        if (storedEmail) setEmail(storedEmail);
    }, []);

    const verifyMutation = useMutation({
        mutationFn: async () => {
            // Get CSRF token
            const csrfToken = document.cookie
                .split("; ")
                .find((row) => row.startsWith("CSRF-TOKEN="))
                ?.split("=")[1];

            const res = await fetch("/api/seller/verify-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken || ""
                },
                credentials: "include",
                body: JSON.stringify({ email, otp }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Verification failed");
            }
            return res.json();
        },
        onSuccess: () => {
            setIsVerified(true);
            toast({
                title: "Email Verified!",
                description: "Your seller account is now under review.",
            });
            localStorage.removeItem("seller_registration_email");
        },
        onError: (error: Error) => {
            toast({
                title: "Verification Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    if (isVerified) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="container mx-auto px-4 py-16">
                    <Card className="max-w-md mx-auto text-center">
                        <CardHeader>
                            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
                            <CardTitle className="text-2xl">Verification Complete</CardTitle>
                            <CardDescription>
                                Thank you for verifying your email.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                Your application has been submitted for admin approval. You will receive an email once your account is active.
                            </p>
                            <Button onClick={() => navigate("/")} className="w-full">
                                Return to Home
                            </Button>
                        </CardContent>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 py-16">
                <Card className="max-w-md mx-auto">
                    <CardHeader className="text-center">
                        <Mail className="h-12 w-12 mx-auto text-primary mb-4" />
                        <CardTitle className="text-2xl">Verify Your Email</CardTitle>
                        <CardDescription>
                            Please enter the verification code sent to your email address.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your registered email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="otp">Verification Code</Label>
                            <Input
                                id="otp"
                                placeholder="Enter 6-digit OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                maxLength={6}
                                className="text-center text-lg tracking-widest"
                            />
                        </div>
                        <Button
                            className="w-full"
                            onClick={() => verifyMutation.mutate()}
                            disabled={verifyMutation.isPending || !email || otp.length < 6}
                        >
                            {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Verify Email
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
