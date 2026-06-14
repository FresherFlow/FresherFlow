import { Metadata } from 'next';
import { Suspense } from 'react';
import PushNotificationClient from './components/PushNotificationClient';

export const metadata: Metadata = {
    title: 'Push Notifications - FresherFlow Admin',
};

export default function PushNotificationsPage() {
    return (
        <div className="flex-1 p-4 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Push Notifications</h1>
                <p className="text-muted-foreground mt-1">
                    Send manual push notifications and alerts to all active mobile app users.
                </p>
            </div>

            <Suspense fallback={<div className="p-8 text-center text-muted-foreground animate-pulse">Loading composer...</div>}>
                <PushNotificationClient />
            </Suspense>
        </div>
    );
}
