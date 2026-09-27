'use client';

import Link from 'next/link';
import { ChevronsUpDown, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { useAdmin } from '@/lib/auth/AdminContext';
import { Avatar, AvatarFallback } from '@/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/DropdownMenu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/ui/sidebar';

/**
 * Faithful port of shadcn-admin's `NavUser`, adapted to the admin shell:
 * no avatar image (email initial instead), Dashboard + Settings links, and
 * sign-out calls `useAdmin().logout()` directly — matching the header
 * profile menu, no confirm dialog.
 */
export function AdminNavUser() {
    const { isMobile } = useSidebar();
    const { admin, moderator, logout } = useAdmin();

    const email = admin?.email ?? moderator?.email ?? '';
    const name =
        admin?.fullName?.trim() || moderator?.name || (email ? email.split('@')[0] : 'Admin');
    const initial = (name ? name.charAt(0) : 'A').toUpperCase();
    const isStaffAdmin = admin != null;

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-start text-sm leading-tight">
                                <span className="truncate font-semibold">{name}</span>
                                <span className="truncate text-xs">{email}</span>
                            </div>
                            <ChevronsUpDown className="ms-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? 'bottom' : 'right'}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-start text-sm leading-tight">
                                    <span className="truncate font-semibold">{name}</span>
                                    <span className="truncate text-xs">{email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {isStaffAdmin ? (
                            <DropdownMenuGroup>
                                <DropdownMenuItem asChild>
                                    <Link href="/admin/dashboard">
                                        <LayoutDashboard className="size-4 shrink-0" />
                                        Dashboard
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/admin/settings">
                                        <Settings className="size-4 shrink-0" />
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
                            onClick={() => {
                                void logout();
                            }}
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        >
                            <LogOut className="size-4 shrink-0" />
                            {isStaffAdmin ? 'Sign out' : 'Exit to app'}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
