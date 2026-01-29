import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

type ProtectedRouteProps = {
    path: string;
    component: () => React.JSX.Element;
    role?: "admin" | "user";
};

export function ProtectedRoute({ path, component: Component, role }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <Route path={path}>
                <div className="flex items-center justify-center min-h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-border" />
                </div>
            </Route>
        );
    }

    if (!user || (role && user.role !== role && user.role !== "admin")) {
        return (
            <Route path={path}>
                <Redirect to="/auth" />
            </Route>
        );
    }

    return <Route path={path} component={Component} />;
}

export default ProtectedRoute;
