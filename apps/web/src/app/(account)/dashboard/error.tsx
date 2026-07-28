'use client';

import { useEffect } from 'react';

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
    useEffect(() => {
        console.error('Dashboard error boundary:', error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full space-y-4 text-center bg-card border border-border rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-bold tracking-tight">Dashboard failed to load</h2>
                <p className="text-sm text-muted-foreground">
                    Please retry. If the issue persists, log out and sign in again.
                </p>
                <button
                    onClick={() => reset()}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-xs font-bold capitalize tracking-widest text-primary-foreground shadow transition-colors hover:bg-primary/90"
                >
                    Retry
                </button>
            </div>
        </div>
    );
}
