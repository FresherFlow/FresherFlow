'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import LoadingScreen from '@/ui/LoadingScreen';

/**
 * AuthGate - Redirects to /login if user is not authenticated.
 *
 * Used on every authenticated route (dashboard, settings, alerts, etc.).
 * If the user has no session, they are redirected to /login?redirect=<current-path>.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && !isLoading && !user) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('ff_cached_session_v1');
            }
            const redirectUrl = pathname && pathname !== '/'
                ? `/login?redirect=${encodeURIComponent(pathname)}`
                : '/login';
            router.push(redirectUrl);
        }
    }, [user, isLoading, pathname, router, mounted]);

    if (!mounted || isLoading) {
        return (
            <div className="relative w-full h-screen flex flex-col items-center justify-center">
                <LoadingScreen message="Loading..." fullScreen={false} className="z-[40] bg-background/95 backdrop-blur-xl" />
            </div>
        );
    }

    if (!user) {
        return <div className="opacity-0 pointer-events-none">{children}</div>; // Will redirect
    }

    return <>{children}</>;
}

/**
 * UsernameGate - Redirects to /choose-username if the authenticated user has not claimed a username.
 *
 * Wraps AuthGate internally. Use this on routes that require a completed profile
 * (dashboard, settings, alerts, etc.). Do NOT use on /choose-username itself.
 */
export function UsernameGate({ children }: { children: React.ReactNode }) {
    const { user, isLoading, skipUsernameSetup } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && !isLoading) {
            if (!user) {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('ff_cached_session_v1');
                }
                const redirectUrl = pathname && pathname !== '/'
                    ? `/login?redirect=${encodeURIComponent(pathname)}`
                    : '/login';
                router.push(redirectUrl);
            } else if (!user.username && !skipUsernameSetup && pathname !== '/choose-username') {
                const redirectParam = pathname && pathname !== '/'
                    ? `?redirect=${encodeURIComponent(pathname)}`
                    : '';
                router.push(`/choose-username${redirectParam}`);
            }
        }
    }, [user, isLoading, skipUsernameSetup, pathname, router, mounted]);

    if (!mounted || isLoading) {
        return (
            <div className="relative w-full h-screen flex flex-col items-center justify-center">
                <LoadingScreen message="Loading..." fullScreen={false} className="z-[40] bg-background/95 backdrop-blur-xl" />
            </div>
        );
    }

    if (!user) {
        return <div className="opacity-0 pointer-events-none">{children}</div>; // Will redirect
    }

    return <>{children}</>;
}

/**
 * @deprecated Use AuthGate or UsernameGate instead.
 * This re-export preserves backward compatibility during migration.
 */
export const ProfileGate = UsernameGate;
