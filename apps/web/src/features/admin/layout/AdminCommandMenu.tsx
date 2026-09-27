'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Laptop, Moon, Sun } from 'lucide-react';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/ui/Command';
import { useAdmin } from '@/lib/auth/AdminContext';
import {
    discoveryNavItems,
    overviewCommandItems,
    settingsNavItems,
} from '@/features/admin/layout/admin-sidebar-data';
import { useAdminPalette } from './AdminPaletteProvider';

export function AdminCommandMenu() {
    const palette = useAdminPalette();
    const router = useRouter();
    const { setTheme } = useTheme();
    const { logout, admin, moderator } = useAdmin();
    // Moderators search only rows their keys unlock; admins see everything.
    // Rows without a permission are admin-only and drop out for moderators.
    const visible = <T extends { permission?: string }>(items: T[]): T[] =>
        !admin && moderator ? items.filter((item) => item.permission != null && moderator.permissions.includes(item.permission)) : items;

    const runNav = React.useCallback(
        (href: string) => {
            palette?.closePalette();
            router.push(href);
        },
        [palette, router],
    );

    if (!palette) return null;

    const overview = visible(overviewCommandItems);
    const manage = visible(settingsNavItems);
    const discovery = visible(
        discoveryNavItems.filter((item) => item.href !== '/admin/dashboard'),
    );

    return (
        <CommandDialog open={palette.open} onOpenChange={palette.setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                {overview.length > 0 && (
                <CommandGroup heading="Overview">
                    {overview.map((item) => {
                        const Icon = item.icon;
                        return (
                            <CommandItem
                                key={item.href}
                                value={`${item.label} ${item.href}`}
                                onSelect={() => runNav(item.href)}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{item.label}</span>
                            </CommandItem>
                        );
                    })}
                </CommandGroup>
                )}
                {manage.length > 0 && (
                <CommandGroup heading="Manage">
                    {manage.map((item) => {
                        const Icon = item.icon;
                        return (
                            <CommandItem
                                key={item.href}
                                value={`${item.label} ${item.href}`}
                                onSelect={() => runNav(item.href)}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{item.label}</span>
                            </CommandItem>
                        );
                    })}
                </CommandGroup>
                )}
                {discovery.length > 0 && (
                <CommandGroup heading="Discovery">
                    {discovery.map((item) => {
                            const Icon = item.icon;
                            return (
                                <CommandItem
                                    key={`${item.label}-${item.href}`}
                                    value={`${item.label} ${item.href}`}
                                    onSelect={() => runNav(item.href)}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{item.label}</span>
                                </CommandItem>
                            );
                        })}
                </CommandGroup>
                )}
                <CommandSeparator />
                <CommandGroup heading="Theme">
                    <CommandItem value="Light theme" onSelect={() => { palette.closePalette(); setTheme('light'); }}>
                        <Sun className="h-4 w-4" />
                        <span>Light</span>
                    </CommandItem>
                    <CommandItem value="Dark theme" onSelect={() => { palette.closePalette(); setTheme('dark'); }}>
                        <Moon className="h-4 w-4" />
                        <span>Dark</span>
                    </CommandItem>
                    <CommandItem value="System theme" onSelect={() => { palette.closePalette(); setTheme('system'); }}>
                        <Laptop className="h-4 w-4" />
                        <span>System</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Account">
                    <CommandItem
                        value="Sign out"
                        onSelect={() => { palette.closePalette(); void logout(); }}
                    >
                        <span>Sign out</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
