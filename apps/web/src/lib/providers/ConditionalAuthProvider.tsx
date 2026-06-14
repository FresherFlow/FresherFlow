'use client';

import { AuthProvider, AuthContext } from '@/lib/auth/AuthContext';
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { ADMIN_WEB_HOST } from "@/lib/utils/runtimeConfig";

export function ConditionalAuthProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isAdminHost = process.env.NODE_ENV === 'production' &&
        typeof window !== 'undefined' &&
        window.location.hostname.toLowerCase() === ADMIN_WEB_HOST;
    const isAdminRoute = pathname?.startsWith('/admin') || isAdminHost;

    // TEMPORARY PIVOT: Disable AuthProvider for regular web users.
    // We provide a dummy context to prevent useAuth() from crashing.
    const isNoAuthMode = true; // FORCE NO-AUTH ON WEB

    if (isAdminRoute) {
        return <AuthProvider>{children}</AuthProvider>;
    }

    if (isNoAuthMode) {
        const dummyAuthValue = {
            user: null,
            profile: null,
            isLoading: false,
            login: async () => { },
            sendOtp: async () => { },
            verifyOtp: async () => { },
            loginWithGoogle: async () => { },
            logout: async () => { },
            refreshUser: async () => { },
            refreshProfile: async () => { },
            forceRefreshProfile: async () => { },
        };

        return (
            <AuthContext.Provider value={dummyAuthValue}>
                {children}
            </AuthContext.Provider>
        );
    }

    return <AuthProvider>{children}</AuthProvider>;
}

