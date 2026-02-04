/**
 * Push Notification Subscription Component
 * 
 * Prompts users to enable browser push notifications
 * for order updates, promotions, and delivery status.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function PushNotificationSubscription() {
    const { toast } = useToast();
    const [permissionState, setPermissionState] = useState<PermissionState>('default');
    const [orderUpdates, setOrderUpdates] = useState(true);
    const [promotions, setPromotions] = useState(true);
    const [deliveryAlerts, setDeliveryAlerts] = useState(true);

    useEffect(() => {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            setPermissionState('unsupported');
            return;
        }

        // Get current permission state
        setPermissionState(Notification.permission as PermissionState);
    }, []);

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            toast({
                title: "Not Supported",
                description: "Your browser doesn't support push notifications.",
                variant: "destructive"
            });
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            setPermissionState(permission as PermissionState);

            if (permission === 'granted') {
                toast({
                    title: "Notifications Enabled!",
                    description: "You'll now receive updates about your orders and deliveries."
                });

                // Show a test notification
                new Notification("Steal the Deal", {
                    body: "Notifications are now enabled! 🎉",
                    icon: "/logo.png",
                    badge: "/logo.png"
                });

                // Save preferences to backend
                await savePreferences();
            } else if (permission === 'denied') {
                toast({
                    title: "Notifications Blocked",
                    description: "Please enable notifications in your browser settings.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Notification permission error:", error);
            toast({
                title: "Error",
                description: "Failed to request notification permission.",
                variant: "destructive"
            });
        }
    };

    const savePreferences = async () => {
        try {
            const csrfToken = document.cookie
                .split("; ")
                .find(row => row.startsWith("CSRF-TOKEN="))
                ?.split("=")[1];

            await fetch("/api/user/notification-preferences", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrfToken || ""
                },
                credentials: "include",
                body: JSON.stringify({
                    orderUpdates,
                    promotions,
                    deliveryAlerts,
                    enabled: permissionState === 'granted'
                })
            });
        } catch (error) {
            console.error("Failed to save notification preferences:", error);
        }
    };

    // Unsupported browser
    if (permissionState === 'unsupported') {
        return (
            <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/20">
                <CardContent className="py-4 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Push notifications are not supported in your browser.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {permissionState === 'granted' ? (
                        <Bell className="h-5 w-5 text-green-600" />
                    ) : (
                        <BellOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    Push Notifications
                </CardTitle>
                <CardDescription>
                    Get instant updates about your orders and exclusive deals.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {permissionState !== 'granted' ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <h4 className="font-medium mb-2">Stay informed about:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>✓ Order status updates</li>
                                <li>✓ Delivery notifications</li>
                                <li>✓ Exclusive deals & offers</li>
                                <li>✓ Flash sale alerts</li>
                            </ul>
                        </div>

                        {permissionState === 'denied' ? (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    Notifications are blocked. Please enable them in your browser settings:
                                </p>
                                <ol className="text-sm text-red-600 dark:text-red-400 list-decimal ml-4 mt-2">
                                    <li>Click the lock/info icon in your address bar</li>
                                    <li>Find "Notifications" settings</li>
                                    <li>Change to "Allow"</li>
                                </ol>
                            </div>
                        ) : (
                            <Button onClick={requestPermission} className="w-full">
                                <Bell className="h-4 w-4 mr-2" />
                                Enable Notifications
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600 mb-4">
                            <Check className="h-4 w-4" />
                            <span className="text-sm font-medium">Notifications enabled</span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="order-updates" className="flex-1">
                                    Order Updates
                                    <p className="text-xs text-muted-foreground font-normal">
                                        Shipping, delivery, and return status
                                    </p>
                                </Label>
                                <Switch
                                    id="order-updates"
                                    checked={orderUpdates}
                                    onCheckedChange={(checked) => {
                                        setOrderUpdates(checked);
                                        savePreferences();
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="delivery-alerts" className="flex-1">
                                    Delivery Alerts
                                    <p className="text-xs text-muted-foreground font-normal">
                                        Real-time delivery tracking updates
                                    </p>
                                </Label>
                                <Switch
                                    id="delivery-alerts"
                                    checked={deliveryAlerts}
                                    onCheckedChange={(checked) => {
                                        setDeliveryAlerts(checked);
                                        savePreferences();
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="promotions" className="flex-1">
                                    Deals & Promotions
                                    <p className="text-xs text-muted-foreground font-normal">
                                        Flash sales, coupons, and special offers
                                    </p>
                                </Label>
                                <Switch
                                    id="promotions"
                                    checked={promotions}
                                    onCheckedChange={(checked) => {
                                        setPromotions(checked);
                                        savePreferences();
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Compact notification trigger button for navbar/header
 */
export function NotificationTriggerButton() {
    const { toast } = useToast();
    const [permission, setPermission] = useState<PermissionState>('default');

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission as PermissionState);
        } else {
            setPermission('unsupported');
        }
    }, []);

    const handleClick = async () => {
        if (permission === 'granted') {
            toast({
                title: "Notifications Active",
                description: "You're receiving push notifications."
            });
            return;
        }

        if (!('Notification' in window)) {
            toast({
                title: "Not Supported",
                description: "Your browser doesn't support notifications.",
                variant: "destructive"
            });
            return;
        }

        const result = await Notification.requestPermission();
        setPermission(result as PermissionState);

        if (result === 'granted') {
            toast({
                title: "Notifications Enabled!",
                description: "You'll now receive updates."
            });
            new Notification("Steal the Deal", {
                body: "You're all set to receive notifications! 🔔",
                icon: "/logo.png"
            });
        }
    };

    if (permission === 'unsupported') {
        return null;
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            title={permission === 'granted' ? "Notifications enabled" : "Enable notifications"}
        >
            {permission === 'granted' ? (
                <Bell className="h-5 w-5 text-green-600" />
            ) : (
                <BellOff className="h-5 w-5" />
            )}
        </Button>
    );
}
