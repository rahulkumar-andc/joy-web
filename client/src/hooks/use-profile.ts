import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useProfile() {
    return useQuery({
        queryKey: [api.profile.get.path],
        queryFn: async () => {
            const res = await fetch(api.profile.get.path, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch profile");
            return api.profile.get.responses[200].parse(await res.json());
        },
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: { name?: string; phone?: string; address?: string }) => {
            const res = await fetch(api.profile.update.path, {
                method: api.profile.update.method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to update profile");
            return api.profile.update.responses[200].parse(await res.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.profile.get.path] });
            queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
            toast({
                title: "Profile updated",
                description: "Your profile has been updated successfully.",
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to update profile",
                variant: "destructive",
            });
        },
    });
}

export function useChangePassword() {
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
            const res = await fetch(api.profile.changePassword.path, {
                method: api.profile.changePassword.method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to change password");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Password changed",
                description: "Your password has been changed successfully.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}

export function useForgotPassword() {
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (email: string) => {
            const res = await fetch(api.auth.forgotPassword.path, {
                method: api.auth.forgotPassword.method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) throw new Error("Failed to send reset email");
            return res.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Email sent",
                description: data.message,
            });
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Failed to send reset email",
                variant: "destructive",
            });
        },
    });
}

export function useResetPassword() {
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: { token: string; password: string }) => {
            const res = await fetch(api.auth.resetPassword.path, {
                method: api.auth.resetPassword.method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to reset password");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Password reset",
                description: "Your password has been reset. You can now login.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });
}
