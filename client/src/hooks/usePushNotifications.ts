/**
 * usePushNotifications Hook
 * Manages browser push notification subscriptions
 */

import { useState, useEffect } from 'react';
import { useToast } from './use-toast';

const VAPID_PUBLIC_KEY_ENDPOINT = '/api/push/vapid-key';
const SUBSCRIBE_ENDPOINT = '/api/push/subscribe';

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Check if push notifications are supported
        const supported = 'serviceWorker' in navigator && 'PushManager' in window;
        setIsSupported(supported);

        if (supported) {
            checkSubscription();
        }
    }, []);

    /**
     * Check if user is already subscribed
     */
    async function checkSubscription() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (error) {
            console.error('Error checking push subscription:', error);
        }
    }

    /**
     * Request notification permission and subscribe
     */
    async function subscribe() {
        if (!isSupported) {
            toast({
                title: 'Not Supported',
                description: 'Push notifications are not supported in your browser',
                variant: 'destructive',
            });
            return false;
        }

        setIsLoading(true);

        try {
            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                toast({
                    title: 'Permission Denied',
                    description: 'Please enable notifications in your browser settings',
                    variant: 'destructive',
                });
                setIsLoading(false);
                return false;
            }

            // Register service worker
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            await navigator.serviceWorker.ready;

            // Get VAPID public key from backend
            const keyRes = await fetch(VAPID_PUBLIC_KEY_ENDPOINT);
            if (!keyRes.ok) throw new Error('Failed to get VAPID key');
            const { publicKey } = await keyRes.json();

            // Subscribe to push notifications
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            });

            // Send subscription to backend
            const res = await fetch(SUBSCRIBE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription.toJSON()),
            });

            if (!res.ok) throw new Error('Failed to save subscription');

            setIsSubscribed(true);
            toast({
                title: 'Notifications Enabled',
                description: 'You will now receive order updates',
            });

            setIsLoading(false);
            return true;
        } catch (error) {
            console.error('Error subscribing to push notifications:', error);
            toast({
                title: 'Subscription Failed',
                description: 'Could not enable notifications. Please try again.',
                variant: 'destructive',
            });
            setIsLoading(false);
            return false;
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async function unsubscribe() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();
                setIsSubscribed(false);
                toast({
                    title: 'Notifications Disabled',
                    description: 'You will no longer receive push notifications',
                });
            }
        } catch (error) {
            console.error('Error unsubscribing from push notifications:', error);
        }
    }

    return {
        isSupported,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe,
    };
}

/**
 * Convert VAPID public key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): BufferSource {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray as BufferSource;
}
