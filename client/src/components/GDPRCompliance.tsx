import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Shield, Cookie, Eye, Download, Trash2 } from "lucide-react";

interface GDPRSettings {
    analyticsEnabled: boolean;
    cookiesAccepted: boolean;
    dataRetentionDays: number;
}

// Get settings from localStorage
function getGDPRSettings(): GDPRSettings {
    const stored = localStorage.getItem("gdpr_settings");
    if (stored) {
        return JSON.parse(stored);
    }
    return {
        analyticsEnabled: true,
        cookiesAccepted: false,
        dataRetentionDays: 90,
    };
}

// Save settings to localStorage
function saveGDPRSettings(settings: GDPRSettings): void {
    localStorage.setItem("gdpr_settings", JSON.stringify(settings));
}

// Cookie consent banner component
export function CookieConsentBanner() {
    const [show, setShow] = useState(false);
    const [settings, setSettings] = useState<GDPRSettings>(getGDPRSettings);

    useEffect(() => {
        // Show banner if cookies not accepted
        if (!settings.cookiesAccepted) {
            // Delay to prevent flash
            const timer = setTimeout(() => setShow(true), 1000);
            return () => clearTimeout(timer);
        }
    }, [settings.cookiesAccepted]);

    const handleAcceptAll = () => {
        const newSettings = { ...settings, cookiesAccepted: true, analyticsEnabled: true };
        setSettings(newSettings);
        saveGDPRSettings(newSettings);
        setShow(false);
    };

    const handleRejectOptional = () => {
        const newSettings = { ...settings, cookiesAccepted: true, analyticsEnabled: false };
        setSettings(newSettings);
        saveGDPRSettings(newSettings);
        setShow(false);
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t shadow-lg">
            <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Cookie className="h-6 w-6 text-primary" />
                    <div>
                        <p className="font-medium">We use cookies</p>
                        <p className="text-sm text-muted-foreground">
                            We use cookies and similar technologies to improve your experience,
                            analyze traffic, and show personalized content.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" onClick={handleRejectOptional}>
                        Essential Only
                    </Button>
                    <Button onClick={handleAcceptAll}>
                        Accept All
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Privacy settings page component
export function PrivacySettings() {
    const [settings, setSettings] = useState<GDPRSettings>(getGDPRSettings);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleToggleAnalytics = (enabled: boolean) => {
        const newSettings = { ...settings, analyticsEnabled: enabled };
        setSettings(newSettings);
        saveGDPRSettings(newSettings);
    };

    const handleExportData = async () => {
        // In production, this would call an API endpoint
        const userData = {
            exportDate: new Date().toISOString(),
            settings: settings,
            note: "This is a placeholder. Real implementation would include all user data.",
        };

        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `my-data-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
    };

    const handleDeleteData = () => {
        // Clear all localStorage data
        localStorage.clear();
        // Reset settings
        setSettings(getGDPRSettings());
        setShowDeleteDialog(false);
        // In production, this would also call an API to delete server-side data
        window.location.reload();
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-2xl">
            <div className="flex items-center gap-3 mb-8">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Privacy Settings</h1>
                    <p className="text-muted-foreground">Manage your data and privacy preferences</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Analytics Opt-out */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Analytics Tracking</CardTitle>
                                <CardDescription>
                                    Allow us to collect anonymous usage data to improve our service
                                </CardDescription>
                            </div>
                            <Switch
                                checked={settings.analyticsEnabled}
                                onCheckedChange={handleToggleAnalytics}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Badge variant={settings.analyticsEnabled ? "default" : "secondary"}>
                            {settings.analyticsEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-2">
                            {settings.analyticsEnabled
                                ? "We collect anonymous data about how you use our site to improve your experience."
                                : "Analytics tracking is disabled. We won't collect usage data."}
                        </p>
                    </CardContent>
                </Card>

                {/* Data Export */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Export Your Data
                        </CardTitle>
                        <CardDescription>
                            Download a copy of all the data we have about you
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" onClick={handleExportData}>
                            <Download className="h-4 w-4 mr-2" />
                            Download My Data
                        </Button>
                    </CardContent>
                </Card>

                {/* Data Deletion */}
                <Card className="border-destructive/50">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2 text-destructive">
                            <Trash2 className="h-4 w-4" />
                            Delete Your Data
                        </CardTitle>
                        <CardDescription>
                            Permanently delete all your data. This action cannot be undone.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete All My Data
                        </Button>
                    </CardContent>
                </Card>

                {/* Cookie Preferences */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Cookie className="h-4 w-4" />
                            Cookie Preferences
                        </CardTitle>
                        <CardDescription>
                            Manage your cookie consent
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b">
                            <div>
                                <p className="font-medium">Essential Cookies</p>
                                <p className="text-xs text-muted-foreground">Required for the site to function</p>
                            </div>
                            <Badge>Always On</Badge>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <p className="font-medium">Analytics Cookies</p>
                                <p className="text-xs text-muted-foreground">Help us understand how you use our site</p>
                            </div>
                            <Switch
                                checked={settings.analyticsEnabled}
                                onCheckedChange={handleToggleAnalytics}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive">Delete All Data?</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground">
                        This will permanently delete all your data including preferences,
                        saved items, and account information. This action cannot be undone.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteData}>
                            Yes, Delete Everything
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Check if analytics should be tracked
export function shouldTrackAnalytics(): boolean {
    const settings = getGDPRSettings();
    return settings.analyticsEnabled && settings.cookiesAccepted;
}
