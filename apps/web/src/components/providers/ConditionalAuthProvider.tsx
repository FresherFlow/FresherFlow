'use client';

import { AuthProvider } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { ADMIN_WEB_HOST } from "@/lib/runtimeConfig";

export function ConditionalAuthProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    // In dev, never treat localhost as an admin host — ADMIN_WEB_HOST is a prod domain.
    // In prod, compare against the configured admin host.
    const isAdminHost = process.env.NODE_ENV === 'production' &&
        typeof window !== 'undefined' &&
        window.location.hostname.toLowerCase() === ADMIN_WEB_HOST;
    const isAdminRoute = pathname?.startsWith('/admin') || isAdminHost;
    const isLandingPage = pathname === '/';

    // Don't wrap admin and pure marketing landing routes with user AuthProvider.
    // This avoids auth bootstrap + /api/auth/me work on the landing page.
    if (isAdminRoute || isLandingPage) {
        return <>{children}</>;
    }

    return <AuthProvider>{children}</AuthProvider>;
}

