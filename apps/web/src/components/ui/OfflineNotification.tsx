'use client';

import { useContext, useState, useSyncExternalStore } from 'react';
import WifiIcon from '@heroicons/react/24/outline/WifiIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import Link from 'next/link';
import { getRecentViewedCount } from '@/lib/offline/recentViewed';
import { AuthContext } from '@/contexts/AuthContext';
import { useOfflineActionQueue } from '@/lib/offline/useOfflineActionQueue';

function useIsOffline() {
    return useSyncExternalStore(
        (callback) => {
            window.addEventListener('online', callback);
            window.addEventListener('offline', callback);
            return () => {
                window.removeEventListener('online', callback);
                window.removeEventListener('offline', callback);
            };
        },
        () => !navigator.onLine,
        () => false
    );
}

export default function OfflineNotification() {
    const authContext = useContext(AuthContext);
    const user = authContext?.user;
    const pendingSyncCount = useOfflineActionQueue(user?.id);
    const isOffline = useIsOffline();

    // dismissed: true hides the banner. Storing the isOffline value at dismiss time
    // so that when the user goes back online then offline again, it auto-shows.
    const [dismissedWhileOffline, setDismissedWhileOffline] = useState(false);

    // When back online, reset dismissed so next offline session shows the banner
    const isDismissed = dismissedWhileOffline && isOffline;

    if (!isOffline || isDismissed) return null;

    const cachedCount = getRecentViewedCount();

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-2 duration-300 md:bottom-8 md:right-8 md:left-auto md:max-w-xs">
            <div className="bg-amber-600/90 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-2xl flex items-start gap-3 border border-amber-500/50">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                    <WifiIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">You&apos;re Offline</p>
                    <p className="text-[10px] opacity-90 leading-tight">
                        {cachedCount > 0
                            ? `${cachedCount} recently viewed listing${cachedCount > 1 ? 's are' : ' is'} available offline.`
                            : 'Viewing cached pages only. Connect to load fresh listings.'}
                    </p>
                    {pendingSyncCount > 0 && (
                        <p className="text-[10px] opacity-90 leading-tight mt-0.5">
                            {pendingSyncCount} update{pendingSyncCount > 1 ? 's' : ''} queued for sync.
                        </p>
                    )}
                    {cachedCount > 0 && (
                        <Link href="/opportunities" className="inline-block mt-1 text-[10px] font-semibold underline">
                            Open opportunities
                        </Link>
                    )}
                </div>
                <button
                    onClick={() => setDismissedWhileOffline(true)}
                    className="shrink-0 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                    aria-label="Dismiss offline notification"
                >
                    <XMarkIcon className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
