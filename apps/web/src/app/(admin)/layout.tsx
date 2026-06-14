'use client';

import { AdminProvider } from '@/lib/auth/AdminContext';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // We strictly defer auth logic to the AdminProvider and the Inner Layout
    // This outer layout just ensures the Context is available.
    return (
        <AdminProvider>
            <div className="min-h-screen">
                {children}
                {/* AdminBottomNav is likely for mobile/tablet, can be kept here or moved inner */}
                {/* Previous code had it conditional. Let's keep it here for now, but it might verify context? */}
                {/* Actually, AdminBottomNav probably needs context to show valid links? */}
                {/* Let's leave it. If user is not logged in, they see login page content mostly. */}
                {/* Checking previous file: logic was: if (isLoginPage) return plain; else return with Nav. */}
                {/* Let's stick to simple wrapper. Navigation should be in the authenticated layout. */}
            </div>
        </AdminProvider>
    );
}
