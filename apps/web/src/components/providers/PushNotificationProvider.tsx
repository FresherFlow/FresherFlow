'use client';

import { useEffect, useRef } from 'react';
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { alertsApi } from '@/lib/api/client';

const PERMISSION_PROMPTED_KEY = 'ff_push_permission_prompted';

function base64ToUint8Array(base64: string) {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(normalized);
    return Uint8Array.from(rawData.split('').map((char) => char.charCodeAt(0)));
}

async function unsubscribeClientSide() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
        await subscription.unsubscribe().catch(() => { });
    }
}

export default function PushNotificationProvider() {
    const authContext = useContext(AuthContext);
    const user = authContext?.user ?? null;
    const previousUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const previousUserId = previousUserIdRef.current;
        const currentUserId = user?.id || null;
        previousUserIdRef.current = currentUserId;

        if (previousUserId && !currentUserId) {
            void alertsApi.unsubscribePush().catch(() => { });
            void unsubscribeClientSide();
        }
    }, [user?.id]);

    useEffect(() => {
        if (!user) return;
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;

        const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) return;

        const subscribe = async () => {
            const registration = await navigator.serviceWorker.ready;
            let permission = Notification.permission;

            if (permission === 'default' && window.localStorage.getItem(PERMISSION_PROMPTED_KEY) !== '1') {
                window.localStorage.setItem(PERMISSION_PROMPTED_KEY, '1');
                permission = await Notification.requestPermission();
            }

            if (permission !== 'granted') return;

            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: base64ToUint8Array(vapidPublicKey),
                });
            }

            await alertsApi.subscribePush(subscription.toJSON() as PushSubscriptionJSON);
        };

        void subscribe().catch(() => { });
    }, [user]);

    return null;
}
