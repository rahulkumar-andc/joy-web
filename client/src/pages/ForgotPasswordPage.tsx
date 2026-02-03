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
import { useState } from "react";
import { useLocation } from "wouter";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { getCookie } from "@/lib/utils";

const forgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState("");

    const form = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" },
    });

    const forgotPasswordMutation = useMutation({
        mutationFn: async (data: ForgotPasswordForm) => {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": getCookie("CSRF-TOKEN") || "",
                },
                body: JSON.stringify(data),
                credentials: "include",
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({ message: "Request failed" }));
                throw new Error(error.message || "Failed to send reset email");
            }
            return res.json();
        },
        onSuccess: (_, variables) => {
            setSubmittedEmail(variables.email);
            setIsSubmitted(true);
        },
        onError: (error) => {
            // Still show success message for security (don't reveal if email exists)
            setSubmittedEmail(form.getValues("email"));
            setIsSubmitted(true);
        },
    });

    const onSubmit = (data: ForgotPasswordForm) => {
        forgotPasswordMutation.mutate(data);
    };

    // Success state
    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-background font-body flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center py-20 px-4">
                    <Card className="border-none shadow-lg w-full max-w-md">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <CardTitle className="font-display text-2xl text-primary">Check Your Email</CardTitle>
                            <CardDescription className="mt-2">
                                If an account exists for <strong>{submittedEmail}</strong>, you will receive a password reset link shortly.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground text-center">
                                Didn't receive the email? Check your spam folder or try again.
                            </p>
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        setIsSubmitted(false);
                                        form.reset();
                                    }}
                                >
                                    Try a different email
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full"
                                    onClick={() => setLocation("/auth")}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Login
                                </Button>
                            </div>
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
                            <Mail className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="font-display text-2xl text-primary">Forgot Password?</CardTitle>
                        <CardDescription>
                            Enter your email address and we'll send you a link to reset your password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email Address</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="email"
                                                    placeholder="hello@example.com"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button
                                    type="submit"
                                    className="w-full bg-primary hover:bg-primary/90"
                                    disabled={forgotPasswordMutation.isPending}
                                >
                                    {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full"
                                    onClick={() => setLocation("/auth")}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Login
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
