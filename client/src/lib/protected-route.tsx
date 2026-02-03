import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import React from "react";

type ProtectedRouteProps = {
    path: string;
    component: React.ComponentType<any>;
    role?: string | string[];
};

export function ProtectedRoute({ path, component: Component, role }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const [location] = useLocation();

    if (isLoading) {
        return (
            <Route path={path}>
                <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-border" />
                </div>
            </Route>
        );
    }

    // Check if user is authenticated - redirect to auth with redirect param
    if (!user) {
        const redirectParam = encodeURIComponent(path);
        return (
            <Route path={path}>
                <Redirect to={`/auth?redirect=${redirectParam}`} />
            </Route>
        );
    }

    // Role Check
    const requiredRoles = Array.isArray(role) ? role : (role ? [role] : []);
    if (requiredRoles.length > 0) {
        // Admin generally accesses everything, but strict checks might be needed.
        // Assuming Admin is superuser for now based on previous logic.
        if (!requiredRoles.includes(user.role) && user.role !== "admin") {
            return (
                <Route path={path}>
                    <Redirect to="/" />
                </Route>
            );
        }
    }

    return <Route path={path} component={Component} />;
}

export default ProtectedRoute;
