'use client';

import { UserAuthProvider as AuthProvider } from "./UserAuthContext";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export function ConditionalAuthProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const adminHost = (process.env.NEXT_PUBLIC_ADMIN_WEB_HOST || '').toLowerCase();
    const isAdminHost = typeof window !== 'undefined' && window.location.hostname.toLowerCase() === adminHost;
    const isAdminRoute = pathname?.startsWith('/admin') || isAdminHost;
    const isLandingPage = pathname === '/';

    // Don't wrap admin and pure marketing landing routes with user AuthProvider.
    // This avoids auth bootstrap + /api/auth/me work on the landing page.
    if (isAdminRoute || isLandingPage) {
        return <>{children}</>;
    }

    return <AuthProvider>{children}</AuthProvider>;
}






