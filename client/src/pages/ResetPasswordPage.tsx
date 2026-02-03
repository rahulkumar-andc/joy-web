import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";
import { getCookie } from "@/lib/utils";

const resetPasswordSchema = z.object({
    newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[a-z]/, "Password must contain a lowercase letter")
        .regex(/[A-Z]/, "Password must contain an uppercase letter")
        .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const searchString = useSearch();
    const searchParams = new URLSearchParams(searchString);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    const [isSuccess, setIsSuccess] = useState(false);
    const [isInvalidToken, setIsInvalidToken] = useState(false);

    useEffect(() => {
        if (!token || !email) {
            setIsInvalidToken(true);
        }
    }, [token, email]);

    const form = useForm<ResetPasswordForm>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { newPassword: "", confirmPassword: "" },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: async (data: ResetPasswordForm) => {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": getCookie("CSRF-TOKEN") || "",
                },
                body: JSON.stringify({
                    email,
                    token,
                    newPassword: data.newPassword,
                }),
                credentials: "include",
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({ message: "Request failed" }));
                throw new Error(error.message || "Failed to reset password");
            }
            return res.json();
        },
        onSuccess: () => {
            setIsSuccess(true);
            toast({
                title: "Password Reset Successful",
                description: "You can now login with your new password.",
            });
        },
        onError: (error) => {
            if (error.message.includes("expired") || error.message.includes("Invalid")) {
                setIsInvalidToken(true);
            }
            toast({
                title: "Reset Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const onSubmit = (data: ResetPasswordForm) => {
        resetPasswordMutation.mutate(data);
    };

    // Invalid/expired token state
    if (isInvalidToken) {
        return (
            <div className="min-h-screen bg-background font-body flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center py-20 px-4">
                    <Card className="border-none shadow-lg w-full max-w-md">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </div>
                            <CardTitle className="font-display text-2xl text-destructive">Invalid or Expired Link</CardTitle>
                            <CardDescription className="mt-2">
                                This password reset link is invalid or has expired. Please request a new one.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                className="w-full"
                                onClick={() => setLocation("/forgot-password")}
                            >
                                Request New Reset Link
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                <Footer />
            </div>
        );
    }

    // Success state
    if (isSuccess) {
        return (
            <div className="min-h-screen bg-background font-body flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center py-20 px-4">
                    <Card className="border-none shadow-lg w-full max-w-md">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <CardTitle className="font-display text-2xl text-primary">Password Reset!</CardTitle>
                            <CardDescription className="mt-2">
                                Your password has been successfully reset. You can now login with your new password.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                className="w-full bg-primary hover:bg-primary/90"
                                onClick={() => setLocation("/auth")}
                            >
                                Go to Login
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background font-body flex flex-col">
            <Navbar />
            <div className="flex-1 flex items-center justify-center py-20 px-4">
                <Card className="border-none shadow-lg w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                            <Lock className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="font-display text-2xl text-primary">Reset Password</CardTitle>
                        <CardDescription>
                            Create a new password for your account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New Password</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="Enter new password"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Confirm Password</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="Confirm new password"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="text-xs text-muted-foreground">
                                    Password must be at least 8 characters and include uppercase, lowercase, and a number.
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-primary hover:bg-primary/90"
                                    disabled={resetPasswordMutation.isPending}
                                >
                                    {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
            <Footer />
        </div>
    );
}
