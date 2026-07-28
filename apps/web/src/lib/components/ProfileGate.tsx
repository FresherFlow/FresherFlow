'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import LoadingScreen from '@/ui/LoadingScreen';

/**
 * Profile Gate - non-blocking wrapper for pages that can render before profile completion.
 */
export function ProfileGate({ children }: { children: React.ReactNode }) {
    const { isLoading } = useAuth();
    const [mounted, setMounted] = React.useState(false);
    
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || isLoading) {
        return (
            <div className="relative w-full h-screen flex flex-col items-center justify-center">
                <LoadingScreen message="Loading..." fullScreen={true} className="z-[40] bg-background/95 backdrop-blur-xl" />
            </div>
        );
    }

    return <>{children}</>;
}

/**
 * Auth Gate - Redirects to login if not authenticated, and redirects to choose-username if username is not claimed yet
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
    const { user, isLoading, skipUsernameSetup } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && !isLoading) {
            if (!user) {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('ff_cached_session_v1');
                }
                const redirectUrl = pathname && pathname !== '/' ? `/login?redirect=${encodeURIComponent(pathname)}` : '/login';
                router.push(redirectUrl);
            } else if (!user.username && !skipUsernameSetup && pathname !== '/choose-username') {
                router.push('/choose-username');
            }
        }
    }, [user, isLoading, skipUsernameSetup, pathname, router, mounted]);

    if (!mounted || isLoading) {
        return (
            <div className="relative w-full h-screen flex flex-col items-center justify-center">
                <LoadingScreen message="Loading..." fullScreen={true} className="z-[40] bg-background/95 backdrop-blur-xl" />
            </div>
        );
    }

    if (!user) {
        return <div className="opacity-0 pointer-events-none">{children}</div>; // Will redirect
    }

    return <>{children}</>;
}
