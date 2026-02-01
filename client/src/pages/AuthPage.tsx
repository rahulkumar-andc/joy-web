import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useLocation, useSearch } from "wouter";
import { useEffect, useState } from "react";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
});

export default function AuthPage() {
  const { user, loginMutation, registerMutation, verifyEmailMutation } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const verifyEmail = searchParams.get("verify_email");
  const mode = searchParams.get("mode");

  const [activeTab, setActiveTab] = useState<string>("login");

  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/");
      }
    }
  }, [user, setLocation]);

  // Handle URL-based tab/mode switching
  useEffect(() => {
    if (mode === "register") {
      setActiveTab("register");
    } else if (mode === "login") {
      setActiveTab("login");
    }
  }, [mode]);


  const loginForm = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema.omit({ name: true })),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "", name: "" },
  });

  const verifyForm = useForm({
    defaultValues: { otp: "" },
  });

  const onLogin = (data: any) => {
    loginMutation.mutate({ email: data.email, password: data.password });
  };

  const onRegister = (data: any) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        // Redirect to verify flow -> Fixes "Blank Screen" by forcing a route change
        setLocation(`/auth?mode=verify&verify_email=${encodeURIComponent(data.email)}`);
      }
    });
  };

  const onVerify = (data: any) => {
    if (!verifyEmail) return;
    verifyEmailMutation.mutate({ email: verifyEmail, otp: data.otp }, {
      onSuccess: () => {
        // Redirect to login -> Logic flow complete
        setLocation("/auth?mode=login");
        // Prefill login email
        loginForm.setValue("email", verifyEmail);
      }
    });
  };

  // Render Verification View if URL param exists
  if (mode === "verify" && verifyEmail) {
    return (
      <div className="min-h-screen bg-background font-body flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-20 px-4">
          <Card className="border-none shadow-lg w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="font-display text-3xl text-primary">Verify Email</CardTitle>
              <CardDescription>Enter the code sent to {verifyEmail}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...verifyForm}>
                <form onSubmit={verifyForm.handleSubmit(onVerify)} className="space-y-4">
                  <FormField
                    control={verifyForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123456"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-primary mt-4"
                    disabled={verifyEmailMutation.isPending}
                  >
                    {verifyEmailMutation.isPending ? "Verifying..." : "Verify Code"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full mt-2"
                    onClick={() => setLocation("/auth?mode=register")}
                  >
                    Back to Register
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

  return (
    <div className="min-h-screen bg-background font-body flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-white p-1 rounded-full shadow-sm border border-border">
            <TabsTrigger value="login" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white">Login</TabsTrigger>
            <TabsTrigger value="register" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="border-none shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="font-display text-3xl text-primary">Welcome Back</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input placeholder="hello@example.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl><Input type="password" {...field} /></FormControl>
                          <FormMessage />
                          <Button variant="ghost" className="px-0 font-normal text-xs" onClick={() => setLocation("/forgot-password")}>
                            Forgot password?
                          </Button>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-accent hover:bg-accent/90 text-white mt-4"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="border-none shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="font-display text-3xl text-primary">Create Account</CardTitle>
                <CardDescription>Join our community for exclusive access</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input placeholder="hello@example.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl><Input type="password" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-white mt-4"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating Account..." : "Register"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
