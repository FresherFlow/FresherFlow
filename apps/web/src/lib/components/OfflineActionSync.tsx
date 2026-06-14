'use client';

import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { flushOfflineActions } from '@/lib/api/offline/actionQueue';

export default function OfflineActionSync() {
    const { user, isLoading } = useAuth();
    const syncingRef = useRef(false);

    useEffect(() => {
        if (isLoading || !user) return;

        const trySync = async (showToast: boolean) => {
            if (syncingRef.current) return;
            if (typeof navigator !== 'undefined' && !navigator.onLine) return;
            syncingRef.current = true;
            try {
                const result = await flushOfflineActions(user.id);
                if (showToast && result.synced > 0) {
                    toast.success(`Synced ${result.synced} offline update${result.synced > 1 ? 's' : ''}.`);
                }
                if (showToast && result.remaining > 0 && result.failed > 0) {
                    toast.error('Some pending updates need login or retry.');
                }
            } finally {
                syncingRef.current = false;
            }
        };

        void trySync(false);
        const onOnline = () => {
            void trySync(true);
        };

        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, [user, isLoading]);

    return null;
}
