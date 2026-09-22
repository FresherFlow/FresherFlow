'use client';

import { useAdmin } from '@/lib/auth/AdminContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type CSSProperties } from 'react';
import AdminBottomNav from '@/features/navigation/AdminBottomNav';
import { AdminSidebar } from '@/features/admin/layout/AdminSidebar';
import { MobileTopNav } from '@/features/navigation/MobileTopNav';
import { TopHeaderBar } from '@/features/navigation/TopHeaderBar';
import { useSidebarOpenState } from '@/features/navigation/sidebarState';
import LoadingScreen from '@/features/shell/LoadingScreen';
import { SidebarProvider } from '@/ui/sidebar';

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAdmin();
    const pathname = usePathname();
    const router = useRouter();
    // Same controlled collapse/width store as the app shell: the rail's gap
    // element reserves content space and the fixed TopHeaderBar
    // (`left: var(--sidebar-w)`) stays in sync, persisting across reloads.
    // No extra padding on the content div: the Sidebar's internal gap already
    // offsets it, and a second offset would push everything right.
    const [sidebarOpen, handleSidebarOpenChange] = useSidebarOpenState();

    useEffect(() => {
        if (!isLoading && !isAuthenticated && !pathname.includes('/login')) {
            router.push('/admin/login');
        }
    }, [isAuthenticated, isLoading, pathname, router]);

    useEffect(() => {
        const title = pathname.includes('/login') ? 'Admin Login' : 'Admin Portal';
        document.title = `${title} - Admin`;
    }, [pathname]);

    if (isLoading) {
        return <LoadingScreen message="Loading admin portal..." />;
    }

    if (!isAuthenticated && !pathname.includes('/login')) {
        return null;
    }

    if (pathname.includes('/login')) {
        return <div className="min-h-screen bg-background text-foreground">{children}</div>;
    }

    return (
        <SidebarProvider
            open={sidebarOpen}
            onOpenChange={handleSidebarOpenChange}
            style={{ "--sidebar-width": "var(--sidebar-w, 12rem)" } as CSSProperties}
        >
            <div className="flex h-dvh w-screen overflow-hidden bg-background text-foreground">
                <AdminSidebar />
                <TopHeaderBar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background md:bg-muted/10 transition-all duration-300 ease-out motion-reduce:transition-none">
                <MobileTopNav />
                <main className="flex-1 h-full min-w-0 min-h-0 flex flex-col overflow-hidden pt-14 md:pt-18 md:px-4 md:pb-4">
                    <div className="w-full h-full flex-1 min-w-0 relative flex flex-col overflow-hidden">
                        {children}
                    </div>
                </main>
                <AdminBottomNav />
            </div>
        </div>
        </SidebarProvider>
    );
}
