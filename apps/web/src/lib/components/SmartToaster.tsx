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
                className: '!p-4 !shadow-2xl text-sm font-bold antialiased',
                duration: 4000,
                style: {
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--foreground))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
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
