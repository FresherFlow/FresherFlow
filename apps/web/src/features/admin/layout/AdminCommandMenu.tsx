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
    mainNavItems,
    settingsNavItems,
} from '@/features/admin/layout/AdminSidebar';
import { useAdminPalette } from './AdminPaletteProvider';

export function AdminCommandMenu() {
    const palette = useAdminPalette();
    const router = useRouter();
    const { setTheme } = useTheme();
    const { logout } = useAdmin();

    const runNav = React.useCallback(
        (href: string) => {
            palette?.closePalette();
            router.push(href);
        },
        [palette, router],
    );

    if (!palette) return null;

    return (
        <CommandDialog open={palette.open} onOpenChange={palette.setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Overview">
                    {mainNavItems.map((item) => {
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
                <CommandGroup heading="Manage">
                    {settingsNavItems.map((item) => {
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
                <CommandGroup heading="Discovery">
                    {discoveryNavItems.map((item) => {
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
