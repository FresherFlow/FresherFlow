'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/features/auth';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/ui/LoadingScreen';

/**
 * Profile Gate - non-blocking wrapper for pages that can render before profile completion.
 */
export function ProfileGate({ children }: { children: React.ReactNode }) {
    const { isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="relative w-full">
                <LoadingScreen message="Loading..." fullScreen={true} className="z-[40] bg-background/95 backdrop-blur-xl" />
                <div className="opacity-0 pointer-events-none">{children}</div>
            </div>
        );
    }

    return <>{children}</>;
}

/**
 * Auth Gate - Redirects to login if not authenticated
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return <LoadingScreen message="Loading..." fullScreen={false} />;
    }

    if (!user) {
        return null; // Will redirect
    }

    return <>{children}</>;
}
