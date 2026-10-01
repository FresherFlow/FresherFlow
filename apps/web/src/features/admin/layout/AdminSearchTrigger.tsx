'use client';

import { Search } from 'lucide-react';
import { cn } from '@/ui/cn';
import { useAdminPalette } from './AdminPaletteProvider';

export function AdminSearchTrigger({ className = '' }: { className?: string }) {
    const palette = useAdminPalette();
    if (!palette) return null;

    return (
        <button
            type="button"
            onClick={palette.openPalette}
            aria-keyshortcuts="Meta+K Control+K"
            aria-label="Search admin"
            className={cn(
                // `hover:bg-accent` resolved to the dark theme's near-white
                // accent (`--color-accent: oklch(97.7%)`), so hovering filled the
                // box solid white with black text. Muted hover matches the rest
                // of the admin controls.
                'group relative flex h-8 w-40 flex-none items-center justify-start gap-2 rounded-md border border-border bg-muted/25 px-2 text-sm font-normal text-muted-foreground shadow-none transition-colors hover:bg-muted/60 hover:text-foreground lg:w-52 xl:w-64',
                className,
            )}
        >
            <Search aria-hidden className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left">Search&hellip;</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-micro font-medium group-hover:bg-muted/60 sm:flex">
                <span className="text-xs">&#8984;</span>K
            </kbd>
        </button>
    );
}
