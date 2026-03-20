'use client';

import { useEffect } from 'react';
import toast, { Toaster, useToasterStore } from 'react-hot-toast';

const TOAST_LIMIT = 2; // Maximum number of toasts visible at once

export function SmartToaster() {
    const { toasts } = useToasterStore();

    useEffect(() => {
        toasts
            .filter((t) => t.visible) // Only count visible toasts
            .filter((_, i) => i >= TOAST_LIMIT) // Find toasts beyond the limit
            .forEach((t) => toast.dismiss(t.id)); // Dismiss them
    }, [toasts]);

    return (
        <Toaster
            position="top-center"
            reverseOrder={false}
            gutter={8}
            toastOptions={{
                className: 'premium-card !p-4 !shadow-2xl border border-border/50 text-sm font-bold antialiased',
                duration: 4000,
                style: {
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                    borderRadius: '16px',
                },
                // Add success/error specific styles if needed
                success: {
                    iconTheme: {
                        primary: '#10b981',
                        secondary: 'white',
                    },
                },
                error: {
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: 'white',
                    },
                }
            }}
        />
    );
}






