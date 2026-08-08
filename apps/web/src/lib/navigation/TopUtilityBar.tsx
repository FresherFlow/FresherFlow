'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useContext } from 'react';
import { AuthContext } from '@/lib/auth/AuthContext';
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import { useTheme } from '@/lib/providers/ThemeContext';
import { AlertsDropdown } from '@/features/notifications/components/AlertsDropdown';
import { useOfflineActionQueue } from '@/lib/api/offline/useOfflineActionQueue';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/ui/DropdownMenu';
import { Cog6ToothIcon, ArrowRightOnRectangleIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import UserCircleIcon from '@heroicons/react/24/outline/UserCircleIcon';

export function TopUtilityBar() {
    const context = useContext(AuthContext);
    const user = context?.user;
    const logout = context?.logout;
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();
    const pendingSyncCount = useOfflineActionQueue(user?.id);

    const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/choose-username';
    const isCandidatePortfolioRoute = pathname?.startsWith('/u/');

    const handleLogout = () => { if (logout) void logout('/login'); };

    const initialLetter = user ? (user.fullName?.[0] || user.username?.[0] || 'U').toUpperCase() : 'U';

    if (isAuthRoute) return null;

    return (
        <div className="hidden md:flex fixed top-0 right-0 h-14 items-center gap-2 pr-6 z-[90]">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />

            {isCandidatePortfolioRoute ? (
                <div className="flex items-center gap-2">
                    <Link
                        href="/dashboard"
                        className="auth-user-only inline-flex items-center h-8 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all duration-150 ease-out active:scale-[0.97] shadow-sm shrink-0"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="/register"
                        className="auth-guest-only inline-flex items-center h-8 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all duration-150 ease-out active:scale-[0.97] shadow-sm shrink-0"
                    >
                        Create Profile
                    </Link>
                </div>
            ) : (
                <>
                    <div className="auth-user-only flex items-center gap-2">
                        {pendingSyncCount > 0 && (
                            <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-600 dark:text-amber-300">
                                {pendingSyncCount} pending
                            </span>
                        )}

                        <AlertsDropdown />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button aria-label="User Menu" suppressHydrationWarning className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border/60 text-xs font-bold uppercase transition-all duration-150 ease-out active:scale-[0.97] hover:border-primary/40 cursor-pointer focus:outline-none">
                                    {initialLetter}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none truncate">{user?.fullName || user?.username || 'User'}</p>
                                        <p className="text-xs leading-none text-muted-foreground truncate">{user?.email || 'Loading...'}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/account" className="cursor-pointer flex items-center">
                                        <Squares2X2Icon className="mr-2 h-4 w-4" />
                                        <span>Account Hub</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/profile" className="cursor-pointer flex items-center">
                                        <UserCircleIcon className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/settings" className="cursor-pointer flex items-center">
                                        <Cog6ToothIcon className="mr-2 h-4 w-4" />
                                        <span>Account Settings</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600 dark:text-red-400 focus:bg-red-500/10 focus:text-red-600 dark:focus:bg-red-500/20 dark:focus:text-red-400 cursor-pointer font-medium" onSelect={handleLogout}>
                                    <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {pathname !== '/app' && (
                        <div className="auth-guest-only flex items-center gap-2">
                            <Link
                                href="/login"
                                className="px-3 py-1.5 text-xs font-semibold text-foreground hover:text-primary transition-all duration-150 ease-out active:scale-[0.97] shrink-0"
                            >
                                Log in
                            </Link>
                            <Link
                                href="/app"
                                target="_self"
                                className="inline-flex items-center h-8 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-85 transition-all duration-150 ease-out active:scale-[0.97] shadow-sm shrink-0"
                            >
                                Get App
                            </Link>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

