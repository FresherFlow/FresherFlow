'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState, useContext } from 'react';
import { cn } from '@/lib/utils';
import { AuthContext } from '@/contexts/AuthContext';
import AuthDialog from '@/features/auth/components/AuthDialog';

export default function TopNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const authContext = useContext(AuthContext);
    const user = authContext?.user || null;
    const logout = authContext?.logout || (async () => { });

    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const typeParamRaw = searchParams.get('type') || '';
    const typeParam = typeParamRaw.toLowerCase();
    const isOpportunitiesRoute = pathname === '/' || pathname.startsWith('/opportunities');
    const isWalkinsMode = isOpportunitiesRoute && (typeParam === 'walkin' || typeParam === 'walk-in' || typeParam === 'walkins' || typeParam === 'walk-ins');
    const isJobsMode = isOpportunitiesRoute && !isWalkinsMode;
    const isAdminRoute = pathname.startsWith('/admin');

    const handleAccountClick = (e: React.MouseEvent) => {
        if (!user) {
            e.preventDefault();
            setIsAuthOpen(true);
        } else {
            setIsDropdownOpen(!isDropdownOpen);
        }
    };

    const handleAlertsClick = (e: React.MouseEvent) => {
        if (!user) {
            e.preventDefault();
            setIsAuthOpen(true);
        }
    };

    return (
        <>
            <nav className="bg-background/80 backdrop-blur-xl sticky top-0 z-40 shadow-xs">
                <div className="max-w-6xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center space-x-2">
                            <span className="text-xl font-bold text-foreground">
                                FresherFlow
                            </span>
                        </Link>

                        {/* Mode Toggle (Center) - Hide on admin/landing */}
                        <div className={cn(
                            "items-center gap-1 bg-muted rounded-lg p-1",
                            isAdminRoute ? "hidden" : "flex"
                        )}>
                            <Link
                                href="/opportunities?type=job"
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                    isJobsMode
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Jobs
                            </Link>
                            <Link
                                href="/opportunities?type=walk-in"
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                    isWalkinsMode
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Walk-ins
                            </Link>
                        </div>

                        {isAdminRoute && (
                            <Link
                                href="/"
                                className="hidden md:flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
                            >
                                <span>View Website</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </Link>
                        )}

                        {/* Right: Alerts + Account */}
                        <div className="flex items-center gap-4 relative">
                            <Link
                                href="/alerts"
                                onClick={handleAlertsClick}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Alerts"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </Link>

                            <div className="relative">
                                <button
                                    onClick={handleAccountClick}
                                    className={cn(
                                        "flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-95 shadow-sm overflow-hidden",
                                        user
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    )}
                                    aria-label="Account"
                                >
                                    {user ? (
                                        <span className="text-sm font-bold">
                                            {user.email?.[0].toUpperCase()}
                                        </span>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    )}
                                </button>

                                {isDropdownOpen && user && (
                                    <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border py-1 z-50">
                                        <div className="px-4 py-2 mb-1">
                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                        </div>
                                        <Link
                                            href="/account"
                                            onClick={() => setIsDropdownOpen(false)}
                                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                                        >
                                            My Profile
                                        </Link>
                                        <Link
                                            href="/account/saved"
                                            onClick={() => setIsDropdownOpen(false)}
                                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                                        >
                                            Saved Jobs
                                        </Link>
                                        <button
                                            onClick={() => {
                                                logout();
                                                setIsDropdownOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                        >
                                            Log Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <AuthDialog
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
            />
        </>
    );
}
