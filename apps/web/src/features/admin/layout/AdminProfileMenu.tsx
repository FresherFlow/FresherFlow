'use client';

import Link from 'next/link';
import { LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { useAdmin } from '@/lib/auth/AdminContext';
import { Avatar, AvatarFallback } from '@/ui/avatar';
import { Button } from '@/ui/Button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/DropdownMenu';

/**
 * Admin profile menu for the header bar (shadcn-admin ProfileDropdown
 * pattern): avatar button with the admin's initial, dropdown with identity,
 * dashboard/settings links, and direct sign out.
 */
export function AdminProfileMenu() {
    const { admin, moderator, logout } = useAdmin();
    const email = admin?.email ?? moderator?.email ?? '';
    const name =
        (admin as { fullName?: string | null } | null)?.fullName ||
        moderator?.name ||
        email.split('@')[0] ||
        'Admin';
    const initial = (name[0] || 'A').toUpperCase();

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    aria-label="Admin profile menu"
                    className="relative h-8 w-8 shrink-0 rounded-full p-0"
                >
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                            {initial}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex min-w-0 flex-col gap-1">
                        <p className="truncate text-sm font-medium leading-none">{name}</p>
                        {email ? (
                            <p className="truncate text-xs leading-none text-muted-foreground">{email}</p>
                        ) : null}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {admin != null ? (
                    <DropdownMenuGroup>
                        <DropdownMenuItem asChild>
                            <Link href="/admin/dashboard">
                                <LayoutDashboard />
                                Dashboard
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/admin/settings">
                                <Settings />
                                Settings
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                ) : (
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                        Moderator queues
                    </DropdownMenuLabel>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                        void logout();
                    }}
                >
                    <LogOut />
                    {admin != null ? 'Sign out' : 'Exit to app'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
