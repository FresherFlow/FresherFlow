'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
    useEffect(() => {
        console.error('Global error boundary:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
            <div className="max-w-md w-full space-y-4 text-center bg-card border border-border rounded-xl p-6 shadow-sm">
                <h1 className="text-xl font-bold tracking-tight">Something went wrong</h1>
                <p className="text-sm text-muted-foreground">
                    We hit an unexpected error. Please try again.
                </p>
                <button
                    onClick={() => reset()}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow transition-colors hover:bg-primary/90"
                >
                    Retry
                </button>
            </div>
        </div>
    );
}






