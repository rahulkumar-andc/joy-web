/**
 * Admin Shipping Settings Page
 * 
 * Clean, minimal, mistake-resistant UI for shipping configuration.
 * Implements strict RBAC with role-appropriate field access.
 * 
 * DESIGN PHILOSOPHY: "Make the right action easy, the wrong action impossible."
 */

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Truck, PartyPopper, Package, AlertCircle, RefreshCw, Info } from "lucide-react";
import api from "@/lib/api";
import { format } from "date-fns";
import { AdminLayout } from "@/components/layout";

// ============================================================================
// CONSTANTS
// ============================================================================

const SETTING_KEYS = {
    FREE_SHIPPING_ENABLED: "free_shipping_enabled",
    DEFAULT_SHIPPING_COST: "default_shipping_cost",
    FREE_SHIPPING_THRESHOLD: "free_shipping_threshold",
    FESTIVE_MODE_ENABLED: "festive_mode_enabled",
    FESTIVE_THRESHOLD: "festive_threshold",
} as const;

// Pre-approved thresholds for Business Admin
const APPROVED_THRESHOLDS = ["199", "299", "499", "999"];

// ============================================================================
// TYPES
// ============================================================================

interface SettingData {
    value: string;
    description: string;
    allowedValues: string[] | null;
    minRoleLevel: number;
    updatedAt: string;
    updatedBy?: { name: string };
    readonly?: boolean;
}

interface ShippingSettingsResponse {
    settings: Record<string, SettingData>;
    userLevel: number;
    canEditAll: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminShippingSettings() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Local form state
    const [formState, setFormState] = useState<Record<string, string>>({});
    const [hasChanges, setHasChanges] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<{ key: string; value: string }[]>([]);

    // ========================================================================
    // DATA FETCHING
    // ========================================================================

    const { data, isLoading, error, refetch } = useQuery<ShippingSettingsResponse>({
        queryKey: ["shipping-settings"],
        queryFn: async () => {
            const res = await api.get("/api/admin/shipping/settings");
            return res.data;
        },
        retry: false,
    });

    // Initialize form state from API data
    useEffect(() => {
        if (data?.settings) {
            const initial: Record<string, string> = {};
            Object.entries(data.settings).forEach(([key, setting]) => {
                initial[key] = setting.value;
            });
            setFormState(initial);
            setHasChanges(false);
        }
    }, [data]);

    // ========================================================================
    // MUTATIONS
    // ========================================================================

    const updateMutation = useMutation({
        mutationFn: async (changes: { key: string; value: string }[]) => {
            // Update each setting sequentially
            for (const { key, value } of changes) {
                await api.put(`/api/admin/shipping/settings/${key}`, { value });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shipping-settings"] });
            toast({
                title: "Settings saved",
                description: "Shipping settings have been updated successfully."
            });
            setHasChanges(false);
            setShowConfirmDialog(false);
        },
        onError: (error: any) => {
            const message = error.response?.status === 403
                ? "You don't have permission to modify shipping settings."
                : error.response?.data?.message || "Failed to save settings.";

            toast({
                title: "Error",
                description: message,
                variant: "destructive"
            });
            setShowConfirmDialog(false);
        }
    });

    // ========================================================================
    // HELPERS
    // ========================================================================

    const isSuperAdmin = data?.canEditAll ?? false;
    const userLevel = data?.userLevel ?? 99;

    const getValue = (key: string): string => formState[key] ?? "";
    const getOriginalValue = (key: string): string => data?.settings[key]?.value ?? "";

    const updateValue = (key: string, value: string) => {
        setFormState(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    // Check if user can edit a specific setting
    const canEdit = (key: string): boolean => {
        if (isSuperAdmin) return true;
        const setting = data?.settings[key];
        return setting?.allowedValues !== null && userLevel <= 10;
    };

    // Get changed settings
    const getChangedSettings = (): { key: string; value: string }[] => {
        const changes: { key: string; value: string }[] = [];
        Object.keys(formState).forEach(key => {
            if (formState[key] !== getOriginalValue(key)) {
                changes.push({ key, value: formState[key] });
            }
        });
        return changes;
    };

    // Handle save
    const handleSave = () => {
        const changes = getChangedSettings();
        if (changes.length === 0) return;
        setPendingChanges(changes);
        setShowConfirmDialog(true);
    };

    const confirmSave = () => {
        updateMutation.mutate(pendingChanges);
    };

    // Get last update info
    const lastUpdatedInfo = useMemo(() => {
        if (!data?.settings) return null;

        let latestKey = "";
        let latestTime = "";

        Object.entries(data.settings).forEach(([key, setting]) => {
            if (!latestTime || setting.updatedAt > latestTime) {
                latestTime = setting.updatedAt;
                latestKey = key;
            }
        });

        if (!latestTime) return null;

        return {
            time: format(new Date(latestTime), "MMM d, yyyy 'at' h:mm a"),
            key: latestKey,
        };
    }, [data?.settings]);

    // ========================================================================
    // RENDER: LOADING STATE
    // ========================================================================

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-2xl mx-auto">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ========================================================================
    // RENDER: ERROR STATE
    // ========================================================================

    if (error) {
        const is403 = (error as any)?.response?.status === 403;

        return (
            <div className="flex flex-col items-center justify-center py-16 max-w-md mx-auto text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                    {is403 ? "Access Denied" : "Failed to load shipping settings"}
                </h3>
                <p className="text-muted-foreground mb-4">
                    {is403
                        ? "You don't have permission to view shipping settings."
                        : "Something went wrong. Please try again."}
                </p>
                {!is403 && (
                    <Button onClick={() => refetch()} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                    </Button>
                )}
            </div>
        );
    }

    // ========================================================================
    // DERIVED STATE
    // ========================================================================

    const freeShippingEnabled = getValue(SETTING_KEYS.FREE_SHIPPING_ENABLED) === "true";
    const festiveEnabled = getValue(SETTING_KEYS.FESTIVE_MODE_ENABLED) === "true";

    // ========================================================================
    // RENDER: MAIN UI
    // ========================================================================

    return (
        <AdminLayout title="Shipping Settings" subtitle="Configure shipping costs and free shipping rules">
            <div className="space-y-6 max-w-2xl mx-auto">
                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Truck className="h-6 w-6" />
                        Shipping Settings
                    </h2>
                    <p className="text-muted-foreground">
                        Configure shipping costs and free shipping rules
                    </p>
                </div>

                {/* Role indicator for Business Admin */}
                {!isSuperAdmin && userLevel <= 10 && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Thresholds are pre-approved by Super Admin.
                            You can select from available options.
                        </AlertDescription>
                    </Alert>
                )}

                {/* ============================================================ */}
                {/* SECTION 1: Base Shipping */}
                {/* ============================================================ */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Package className="h-5 w-5" />
                            Base Shipping
                        </CardTitle>
                        <CardDescription>
                            Default shipping cost when free shipping doesn't apply
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <Label className="text-base">Default Shipping Cost</Label>
                                <p className="text-sm text-muted-foreground">
                                    Charged when order doesn't qualify for free shipping
                                </p>
                            </div>
                            {isSuperAdmin ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">₹</span>
                                    <Input
                                        type="number"
                                        className="w-24 text-right"
                                        value={getValue(SETTING_KEYS.DEFAULT_SHIPPING_COST)}
                                        onChange={(e) => updateValue(SETTING_KEYS.DEFAULT_SHIPPING_COST, e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div className="text-xl font-semibold text-muted-foreground">
                                    ₹{getValue(SETTING_KEYS.DEFAULT_SHIPPING_COST)}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ============================================================ */}
                {/* SECTION 2: Free Shipping Rules */}
                {/* ============================================================ */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Truck className="h-5 w-5" />
                            Free Shipping Rules
                        </CardTitle>
                        <CardDescription>
                            Configure when customers get free shipping
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Master Toggle */}
                        <div className="flex items-center justify-between py-3 border-b">
                            <div>
                                <Label className="text-base">Enable Free Shipping</Label>
                                <p className="text-sm text-muted-foreground">
                                    Master switch for free shipping eligibility
                                </p>
                            </div>
                            <Switch
                                checked={freeShippingEnabled}
                                onCheckedChange={(checked) =>
                                    updateValue(SETTING_KEYS.FREE_SHIPPING_ENABLED, checked ? "true" : "false")
                                }
                                disabled={!isSuperAdmin}
                            />
                        </div>

                        {/* Threshold */}
                        <div className={`flex items-center justify-between py-3 transition-opacity ${!freeShippingEnabled ? "opacity-50" : ""
                            }`}>
                            <div>
                                <Label className="text-base">Free Shipping Threshold</Label>
                                <p className="text-sm text-muted-foreground">
                                    Minimum order value for free shipping
                                </p>
                            </div>
                            {isSuperAdmin ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">₹</span>
                                    <Input
                                        type="number"
                                        className="w-24 text-right"
                                        value={getValue(SETTING_KEYS.FREE_SHIPPING_THRESHOLD)}
                                        onChange={(e) => updateValue(SETTING_KEYS.FREE_SHIPPING_THRESHOLD, e.target.value)}
                                        disabled={!freeShippingEnabled}
                                    />
                                </div>
                            ) : (
                                <Select
                                    value={getValue(SETTING_KEYS.FREE_SHIPPING_THRESHOLD)}
                                    onValueChange={(value) => updateValue(SETTING_KEYS.FREE_SHIPPING_THRESHOLD, value)}
                                    disabled={!freeShippingEnabled || !canEdit(SETTING_KEYS.FREE_SHIPPING_THRESHOLD)}
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {APPROVED_THRESHOLDS.map((val) => (
                                            <SelectItem key={val} value={val}>₹{val}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* ============================================================ */}
                {/* SECTION 3: Festive Mode */}
                {/* ============================================================ */}
                <Card className="border-amber-200 bg-gradient-to-br from-amber-50/30 to-orange-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <PartyPopper className="h-5 w-5 text-amber-600" />
                            Festive Mode
                        </CardTitle>
                        <CardDescription>
                            Lower threshold during promotional periods
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Toggle */}
                        <div className="flex items-center justify-between py-3 border-b border-amber-100">
                            <div>
                                <Label className="text-base">Enable Festive Mode</Label>
                                <p className="text-sm text-muted-foreground">
                                    Applies festive threshold instead of regular
                                </p>
                            </div>
                            <Switch
                                checked={festiveEnabled}
                                onCheckedChange={(checked) =>
                                    updateValue(SETTING_KEYS.FESTIVE_MODE_ENABLED, checked ? "true" : "false")
                                }
                                // Business Admin can toggle festive mode
                                disabled={userLevel > 10}
                            />
                        </div>

                        {/* Festive Threshold - Only shown when festive mode is ON */}
                        {festiveEnabled && (
                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <Label className="text-base">Festive Threshold</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Lower threshold for festive period
                                    </p>
                                </div>
                                {isSuperAdmin ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">₹</span>
                                        <Input
                                            type="number"
                                            className="w-24 text-right"
                                            value={getValue(SETTING_KEYS.FESTIVE_THRESHOLD)}
                                            onChange={(e) => updateValue(SETTING_KEYS.FESTIVE_THRESHOLD, e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <Select
                                        value={getValue(SETTING_KEYS.FESTIVE_THRESHOLD)}
                                        onValueChange={(value) => updateValue(SETTING_KEYS.FESTIVE_THRESHOLD, value)}
                                        disabled={!canEdit(SETTING_KEYS.FESTIVE_THRESHOLD)}
                                    >
                                        <SelectTrigger className="w-32">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {APPROVED_THRESHOLDS.map((val) => (
                                                <SelectItem key={val} value={val}>₹{val}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ============================================================ */}
                {/* FOOTER: Save Button + Audit Info */}
                {/* ============================================================ */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                        {lastUpdatedInfo && (
                            <span>Last updated {lastUpdatedInfo.time}</span>
                        )}
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || updateMutation.isPending}
                        size="lg"
                    >
                        {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </div>

                {/* ============================================================ */}
                {/* CONFIRMATION DIALOG */}
                {/* ============================================================ */}
                <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Changes</DialogTitle>
                            <DialogDescription>
                                Shipping rules affect checkout revenue. Are you sure you want to save these changes?
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <div className="space-y-2 text-sm">
                                {pendingChanges.map(({ key, value }) => (
                                    <div key={key} className="flex justify-between p-2 bg-muted rounded">
                                        <span className="text-muted-foreground">{key}</span>
                                        <span className="font-mono">
                                            {getOriginalValue(key)} → {value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={confirmSave} disabled={updateMutation.isPending}>
                                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Confirm Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    );
}
