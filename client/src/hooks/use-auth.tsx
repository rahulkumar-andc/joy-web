import { useQuery, useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type InsertUser, type User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { createContext, useContext, ReactNode } from "react";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  loginMutation: UseMutationResult<User, Error, Pick<InsertUser, "email" | "password">>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<{ message: string, userId: number }, Error, InsertUser>;
  verifyEmailMutation: UseMutationResult<any, Error, { email: string, otp: string }>;
};

import { getCookie } from "@/lib/utils";

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.auth.me.responses[200].parse(await res.json());
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: Pick<InsertUser, "email" | "password">) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
        },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Login failed" }));
        if (res.status === 401) throw new Error("Invalid credentials");
        throw new Error(error.message || "Login failed");
      }
      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
      toast({ title: "Welcome back!", description: `Logged in as ${user.name}` });
    },
    onError: (error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: api.auth.logout.method,
        headers: {
          "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      // Clear all cached data (cart, wishlist, profile, etc.)
      queryClient.invalidateQueries();
      queryClient.resetQueries();
      toast({ title: "Logged out", description: "See you soon!" });
    },
  });



  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Registration failed");
      }
      return api.auth.register.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      // Don't log in immediately. Show check email message.
      toast({ title: "Registration Successful", description: data.message });
    },
    onError: (error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  const verifyEmailMutation = useMutation({
    mutationFn: async (data: { email: string, otp: string }) => {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": getCookie("CSRF-TOKEN") || ""
        },
        body: JSON.stringify(data),
        credentials: "include" // Cookies needed? Maybe for future.
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Verification failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Verified", description: "Email verified! You can now login." });
    },
    onError: (error) => {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
    }
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        loginMutation,
        logoutMutation,
        registerMutation,
        verifyEmailMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
