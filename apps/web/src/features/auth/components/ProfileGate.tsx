'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import LoadingScreen from '@/features/shell/LoadingScreen';

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

    // Stale-while-revalidate: a signed-in user keeps seeing the page while a
    // background refresh runs. Blanket-loading on every isLoading flip is what
    // made every gated page flash Loading → content → Loading → content, since
    // the Firebase auth listener triggers a non-silent loadUser on mount.
    if (!mounted || (isLoading && !user)) {
        return (
            <div className="relative w-full h-screen flex flex-col items-center justify-center">
                <LoadingScreen message="Loading..." fullScreen={false} className="z-40" />
            </div>
        );
    }

    if (!user) {
        // `null`, not `<div className="opacity-0 pointer-events-none">`. Hidden
        // markup still mounts and still runs effects, so every gated page's data
        // fetches fired for anonymous visitors on top of the redirect — and
        // `pointer-events-none` does not stop scripted events. Nothing should be
        // in the DOM until the session is known.
        return null;
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
    const { user, isLoading } = useAuth();
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
            } else if (!user.username && pathname !== '/choose-username' && pathname !== '/login') {
                // username is mandatory like Twitter — keep on username until claimed
                const redirectParam = pathname && pathname !== '/'
                    ? `?redirect=${encodeURIComponent(pathname)}`
                    : '';
                router.push(`/choose-username${redirectParam}`);
            }
        }
    }, [user, isLoading, pathname, router, mounted]);

    // Same stale-while-revalidate rule as AuthGate above: never blank a
    // signed-in user for a background refresh.
    if (!mounted || (isLoading && !user)) {
        return (
            <div className="relative w-full h-screen flex flex-col items-center justify-center">
                <LoadingScreen message="Loading..." fullScreen={false} className="z-40" />
            </div>
        );
    }

    if (!user) {
        // See AuthGate above: hidden-but-mounted children still run their
        // effects and their requests.
        return null;
    }

    return <>{children}</>;
}

/**
 * @deprecated Use AuthGate or UsernameGate instead.
 * This re-export preserves backward compatibility during migration.
 */
export const ProfileGate = UsernameGate;
