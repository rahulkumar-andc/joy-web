import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import NotFound from "@/pages/not-found";

import HomePage from "@/pages/HomePage";
import ShopPage from "@/pages/ShopPage";
import ProductPage from "@/pages/ProductPage";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import AuthPage from "@/pages/AuthPage";
import OrdersPage from "@/pages/OrdersPage";
import WishlistPage from "@/pages/WishlistPage";
import ProtectedRoute from "@/lib/protected-route";

import AdminProducts from "@/pages/admin/AdminProducts";
import AdminOrders from "@/pages/admin/AdminOrders";
import ProfilePage from "@/pages/ProfilePage";
import AdminPage from "@/pages/admin/AdminPage";
import { BottomNav } from "@/components/BottomNav";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/shop" component={ShopPage} />
      <Route path="/product/:id" component={ProductPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/wishlist" component={WishlistPage} />
      <Route path="/profile" component={ProfilePage} />

      {/* Admin Routes */}
      <ProtectedRoute path="/admin" component={AdminPage} role="admin" />
      <ProtectedRoute path="/admin/products" component={AdminProducts} role="admin" />
      <ProtectedRoute path="/admin/orders" component={AdminOrders} role="admin" />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <div className="pb-16 md:pb-0">
                <Router />
              </div>
              <BottomNav />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;
