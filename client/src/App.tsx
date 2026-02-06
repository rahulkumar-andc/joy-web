import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { BottomNav } from "@/components/BottomNav";
import { CookieConsentBanner, PrivacySettings } from "@/components/GDPRCompliance";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PromotionalBanner } from "@/components/PromotionalBanner";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// === Lazy Load Pages ===
// Core Pages
const HomePage = lazy(() => import("@/pages/HomePage"));
const ShopPage = lazy(() => import("@/pages/ShopPage"));
const ProductPage = lazy(() => import("@/pages/ProductPage"));
const CartPage = lazy(() => import("@/pages/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/CheckoutPage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const OrdersPage = lazy(() => import("@/pages/OrdersPage"));
const WishlistPage = lazy(() => import("@/pages/WishlistPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Protected / Utility Pages
const ProtectedRoute = lazy(() => import("@/lib/protected-route"));
const RoleDashboardRedirect = lazy(() => import("@/components/RoleDashboardRedirect"));
const OrderSuccessPage = lazy(() => import("@/pages/OrderSuccessPage"));
const OrderFailurePage = lazy(() => import("@/pages/OrderFailurePage"));

// Admin Pages
const AdminPage = lazy(() => import("@/pages/admin/AdminPage"));
const AdminProducts = lazy(() => import("@/pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders"));
const AdminDeliveries = lazy(() => import("@/pages/admin/AdminDeliveries"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminCampaigns = lazy(() => import("@/pages/admin/AdminCampaigns"));
const LivePreviewCampaign = lazy(() => import("@/pages/admin/LivePreviewCampaign"));
const AdminSellersPage = lazy(() => import("@/pages/admin/AdminSellersPage"));
const AdminProductModerationPage = lazy(() => import("@/pages/admin/AdminProductModerationPage"));
const AdminPayoutApprovalPage = lazy(() => import("@/pages/admin/AdminPayoutApprovalPage"));
const AnalyticsDashboard = lazy(() => import("@/pages/admin/AnalyticsDashboard"));
const ContentModeration = lazy(() => import("@/pages/admin/ContentModeration"));
const AdminRefundsPage = lazy(() => import("@/pages/admin/AdminRefundsPage"));
const AdminReturnDisputesPage = lazy(() => import("@/pages/admin/AdminReturnDisputesPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminRBAC = lazy(() => import("@/pages/admin/AdminRBAC"));
const AdminShippingSettings = lazy(() => import("@/pages/admin/AdminShippingSettings"));
const AdminCoupons = lazy(() => import("@/pages/admin/AdminCoupons"));
const AdminResellers = lazy(() => import("@/pages/admin/AdminResellers"));
const AdminPayouts = lazy(() => import("@/pages/admin/AdminPayouts"));
const AdminCustomerDetailPage = lazy(() => import("@/pages/admin/AdminCustomerDetailPage"));
const AdminSupportPage = lazy(() => import("@/pages/admin/AdminSupportPage"));
const AdminTicketDetailPage = lazy(() => import("@/pages/admin/AdminTicketDetailPage"));



// Seller Pages
const SellerDashboard = lazy(() => import("@/pages/seller/SellerDashboard"));
const SellerPage = lazy(() => import("@/pages/seller/SellerPage"));
const SellerRegistrationPage = lazy(() => import("@/pages/seller/SellerRegistrationPage"));
const SellerVerifyPage = lazy(() => import("@/pages/seller/SellerVerifyPage"));
const SellerProductsPage = lazy(() => import("@/pages/seller/SellerProductsPage"));
const SellerProductFormPage = lazy(() => import("@/pages/seller/SellerProductFormPage"));
const SellerOrdersPage = lazy(() => import("@/pages/seller/SellerOrdersPage"));
const SellerReturnRequestsPage = lazy(() => import("@/pages/seller/SellerReturnRequestsPage"));
const SellerWalletPage = lazy(() => import("@/pages/seller/SellerWalletPage"));
const SellerProfilePage = lazy(() => import("@/pages/seller/SellerProfilePage"));

// Courier Pages
const CourierDashboard = lazy(() => import("@/pages/courier/CourierDashboard"));

// Role-Specific Dashboards
const OpsDashboard = lazy(() => import("@/pages/ops/OpsDashboard"));
const SupportDashboard = lazy(() => import("@/pages/support/SupportDashboard"));
const BusinessDashboard = lazy(() => import("@/pages/business/BusinessDashboard"));

// Reseller Pages
const BecomeResellerPage = lazy(() => import("@/pages/reseller").then(m => ({ default: m.BecomeResellerPage })));
const ResellerDashboard = lazy(() => import("@/pages/reseller").then(m => ({ default: m.ResellerDashboard })));
const ResellerCatalogPage = lazy(() => import("@/pages/reseller").then(m => ({ default: m.ResellerCatalogPage })));
const ResellerEarningsPage = lazy(() => import("@/pages/reseller").then(m => ({ default: m.ResellerEarningsPage })));
const ResellerPayoutsPage = lazy(() => import("@/pages/reseller").then(m => ({ default: m.ResellerPayoutsPage })));
const ResellerBankSettingsPage = lazy(() => import("@/pages/reseller").then(m => ({ default: m.ResellerBankSettingsPage })));

// Account Pages
const OrderDetailPage = lazy(() => import("@/pages/account/OrderDetailPage"));
const InvoicePage = lazy(() => import("@/pages/account/InvoicePage"));
const SavedPaymentsPage = lazy(() => import("@/pages/account/SavedPaymentsPage"));

// Discovery Pages
const CategoryPage = lazy(() => import("@/pages/discovery/CategoryPage"));
const SubCategoryPage = lazy(() => import("@/pages/discovery/SubCategoryPage"));
const SearchPage = lazy(() => import("@/pages/discovery/SearchPage"));

// Post-Order Pages
const CancelOrderPage = lazy(() => import("@/pages/order/CancelOrderPage"));
const ReturnPage = lazy(() => import("@/pages/order/ReturnPage"));
const RefundStatusPage = lazy(() => import("@/pages/order/RefundStatusPage"));
const TrackOrderPage = lazy(() => import("@/pages/order/TrackOrderPage"));

// Info & Legal Pages
const ContactPage = lazy(() => import("@/pages/info/ContactPage"));
const FAQPage = lazy(() => import("@/pages/info/FAQPage"));
const PrivacyPage = lazy(() => import("@/pages/info/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/info/TermsPage"));
const ShippingPage = lazy(() => import("@/pages/info/ShippingPage"));
const AboutPage = lazy(() => import("@/pages/legal/AboutPage"));
const ReturnPolicyPage = lazy(() => import("@/pages/legal/ReturnPolicyPage"));

// Support Pages
// Support Pages
const HelpCenterPage = lazy(() => import("@/pages/support/HelpCenterPage"));
const RaiseTicketPage = lazy(() => import("@/pages/support/RaiseTicketPage"));
const TicketDetailPage = lazy(() => import("@/pages/support/TicketDetailPage"));
const ChatSupportPage = lazy(() => import("@/pages/support/ChatSupportPage"));
const MyTicketsPage = lazy(() => import("@/pages/account/MyTicketsPage"));
const AccountTicketDetailPage = lazy(() => import("@/pages/account/TicketDetailPage"));



function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/dashboard" component={RoleDashboardRedirect} />
        <Route path="/shop" component={ShopPage} />

        {/* Discovery Routes */}
        <Route path="/category/:slug" component={CategoryPage} />
        <Route path="/category/:categorySlug/:subSlug" component={SubCategoryPage} />
        <Route path="/search" component={SearchPage} />

        <Route path="/seller" component={SellerPage} />
        <Route path="/product/:id" component={ProductPage} />
        <Route path="/cart" component={CartPage} />
        <Route path="/checkout" component={CheckoutPage} />
        <Route path="/auth/reset-password" component={ResetPasswordPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/wishlist" component={WishlistPage} />
        <Route path="/profile" component={ProfilePage} />

        {/* Account Routes */}
        <Route path="/orders/:id" component={OrderDetailPage} />
        <Route path="/orders/:id/invoice" component={InvoicePage} />
        <Route path="/orders/:id/invoice" component={InvoicePage} />
        <Route path="/account/payments" component={SavedPaymentsPage} />
        <Route path="/account/tickets" component={MyTicketsPage} />
        <Route path="/account/tickets/:id" component={AccountTicketDetailPage} />


        {/* Post-Order Routes */}
        <Route path="/orders/:id/cancel" component={CancelOrderPage} />
        <Route path="/orders/:id/return" component={ReturnPage} />
        <Route path="/orders/:id/refund" component={RefundStatusPage} />
        <Route path="/orders/:id/track" component={TrackOrderPage} />
        <Route path="/order-success" component={OrderSuccessPage} />
        <Route path="/order-failure" component={OrderFailurePage} />

        {/* Info Pages */}
        <Route path="/contact" component={ContactPage} />

        {/* Support Routes */}
        <Route path="/help-center" component={HelpCenterPage} />
        <Route path="/support/raise-ticket" component={RaiseTicketPage} />
        <Route path="/support/ticket/:id" component={TicketDetailPage} />
        <Route path="/support/chat" component={ChatSupportPage} />

        <Route path="/faq" component={FAQPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/shipping" component={ShippingPage} />

        {/* Legal Routes */}
        <Route path="/about" component={AboutPage} />
        <Route path="/return-policy" component={ReturnPolicyPage} />

        {/* Reseller Routes */}
        <Route path="/reseller/join" component={BecomeResellerPage} />
        <Route path="/reseller/dashboard" component={ResellerDashboard} />
        <Route path="/reseller/catalog" component={ResellerCatalogPage} />
        <Route path="/reseller/earnings" component={ResellerEarningsPage} />
        <Route path="/reseller/payouts" component={ResellerPayoutsPage} />
        <Route path="/reseller/bank" component={ResellerBankSettingsPage} />

        {/* Courier Routes */}
        <ProtectedRoute path="/courier/dashboard" component={CourierDashboard} />

        {/* Role-Specific Dashboard Routes */}
        <ProtectedRoute path="/ops/dashboard" component={OpsDashboard} />
        <ProtectedRoute path="/ops/orders" component={OpsDashboard} />
        <ProtectedRoute path="/ops/couriers" component={OpsDashboard} />
        <ProtectedRoute path="/ops/deliveries" component={OpsDashboard} />
        <ProtectedRoute path="/ops/cod" component={OpsDashboard} />
        <ProtectedRoute path="/support/dashboard" component={SupportDashboard} />
        <ProtectedRoute path="/support/tickets" component={SupportDashboard} />
        <ProtectedRoute path="/support/refunds" component={SupportDashboard} />
        <ProtectedRoute path="/support/customers" component={SupportDashboard} />
        <ProtectedRoute path="/business/dashboard" component={BusinessDashboard} />
        <ProtectedRoute path="/business/categories" component={BusinessDashboard} />

        {/* Admin Routes */}
        <Route path="/admin" component={AdminPage} />
        <Route path="/admin/products" component={AdminProducts} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/deliveries" component={AdminDeliveries} />
        <Route path="/admin/settings" component={AdminSettings} />

        {/* Seller Routes - Protected (require login) */}
        <ProtectedRoute path="/seller/dashboard" component={SellerDashboard} />
        <ProtectedRoute path="/seller/register" component={SellerRegistrationPage} />
        <ProtectedRoute path="/seller/verify" component={SellerVerifyPage} />
        <ProtectedRoute path="/seller/products" component={SellerProductsPage} />
        <ProtectedRoute path="/seller/products/new" component={SellerProductFormPage} />
        <ProtectedRoute path="/seller/products/:id/edit" component={SellerProductFormPage} />
        <ProtectedRoute path="/seller/orders" component={SellerOrdersPage} />
        <ProtectedRoute path="/seller/returns" component={SellerReturnRequestsPage} />
        <ProtectedRoute path="/seller/returns" component={SellerReturnRequestsPage} />
        <ProtectedRoute path="/seller/wallet" component={SellerWalletPage} />
        <ProtectedRoute path="/seller/payouts" component={SellerWalletPage} />
        <ProtectedRoute path="/seller/profile" component={SellerProfilePage} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsersPage} />
        <Route path="/admin/users/:id" component={AdminCustomerDetailPage} />
        <Route path="/admin/sellers" component={AdminSellersPage} />
        <Route path="/admin/products/moderation" component={AdminProductModerationPage} />
        <Route path="/admin/payouts" component={AdminPayoutApprovalPage} />
        <Route path="/admin/campaigns" component={AdminCampaigns} />
        <Route path="/admin/campaigns/livepreview" component={LivePreviewCampaign} />
        <Route path="/admin/analytics" component={AnalyticsDashboard} />
        <Route path="/admin/moderation" component={ContentModeration} />
        <Route path="/admin/refunds" component={AdminRefundsPage} />
        <Route path="/admin/disputes" component={AdminReturnDisputesPage} />
        <Route path="/admin/rbac" component={AdminRBAC} />
        <Route path="/admin/shipping" component={AdminShippingSettings} />
        <Route path="/admin/coupons" component={AdminCoupons} />
        <Route path="/admin/resellers" component={AdminResellers} />
        <Route path="/admin/support" component={AdminSupportPage} />
        <Route path="/admin/support/:id" component={AdminTicketDetailPage} />
        <Route path="/privacy-settings" component={PrivacySettings} />


        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <ThemeProvider>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <PromotionalBanner />
                <div className="pb-16 md:pb-0">
                  <Router />
                </div>
                <BottomNav />
                <CookieConsentBanner />
              </TooltipProvider>
            </AuthProvider>
          </ThemeProvider>
        </HelmetProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
