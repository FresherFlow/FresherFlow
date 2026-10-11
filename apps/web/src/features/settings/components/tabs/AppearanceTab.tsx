'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
    ArrowLeftIcon,
    ArrowPathIcon,
    ComputerDesktopIcon,
    MoonIcon,
    PaintBrushIcon,
    SunIcon,
} from '@heroicons/react/24/outline';
import { useAppLayout, type AppSidebarVariant } from '@/features/navigation/AppLayoutProvider';

const THEME_OPTIONS = [
    { value: 'light', label: 'Light', Icon: SunIcon },
    { value: 'dark', label: 'Dark', Icon: MoonIcon },
    { value: 'system', label: 'System', Icon: ComputerDesktopIcon },
] as const;

type ThemeValue = (typeof THEME_OPTIONS)[number]['value'];

const SIDEBAR_STYLE_OPTIONS: {
    value: AppSidebarVariant;
    label: string;
    description: string;
}[] = [
    { value: 'sidebar', label: 'Sidebar', description: 'Full-height rail at the edge' },
    { value: 'floating', label: 'Floating', description: 'Detached rounded rail' },
    { value: 'inset', label: 'Inset', description: 'Content in a rounded card' },
];

/**
 * Simple div-only preview tile for one sidebar style — no custom assets.
 * Rail block + content block + two skeleton bars, arranged per variant.
 */
function SidebarStylePreview({ value }: { value: AppSidebarVariant }) {
    const bars = (
        <div className="flex flex-1 flex-col justify-center gap-1 px-1.5">
            <div className="h-1 w-3/4 rounded-full bg-muted-foreground/30" />
            <div className="h-1 w-1/2 rounded-full bg-muted-foreground/20" />
        </div>
    );

    if (value === 'floating') {
        return (
            <div className="flex h-16 w-full gap-1 rounded-lg border border-border bg-muted/40 p-1" aria-hidden="true">
                <div className="flex w-5 shrink-0 flex-col gap-1 rounded-md border border-border bg-card p-1">
                    <div className="h-1 w-full rounded-full bg-muted-foreground/30" />
                    <div className="h-1 w-2/3 rounded-full bg-muted-foreground/20" />
                </div>
                <div className="flex flex-1 rounded-md bg-card/70">{bars}</div>
            </div>
        );
    }

    if (value === 'inset') {
        return (
            <div className="flex h-16 w-full gap-1 rounded-lg border border-border bg-muted/40 p-1" aria-hidden="true">
                <div className="w-4 shrink-0 rounded-sm bg-muted-foreground/30" />
                <div className="flex flex-1 rounded-md border border-border bg-card">{bars}</div>
            </div>
        );
    }

    return (
        <div className="flex h-16 w-full overflow-hidden rounded-lg border border-border bg-muted/40" aria-hidden="true">
            <div className="flex w-6 shrink-0 flex-col gap-1 border-r border-border bg-card p-1">
                <div className="h-1 w-full rounded-full bg-muted-foreground/30" />
                <div className="h-1 w-2/3 rounded-full bg-muted-foreground/20" />
            </div>
            <div className="flex flex-1">{bars}</div>
        </div>
    );
}

/**
 * Account → Appearance. Theme mode (Light / Dark / System via next-themes)
 * plus the sidebar style picker (Sidebar / Floating / Inset) bound to
 * `AppLayoutProvider`, whose `variant` already drives `<Sidebar>` in
 * `AppSidebar`. Reset restores both to their defaults.
 */
export default function AppearanceTab() {
    const router = useRouter();
    const { variant, setVariant, collapsible, resetLayout } = useAppLayout();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    // Pre-mount `theme` is undefined on both server and first client paint —
    // treat it as the `system` default so SSR and hydration agree.
    const themeValue: ThemeValue =
        mounted && (theme === 'light' || theme === 'dark' || theme === 'system') ? theme : 'system';

    const isDefault = variant === 'sidebar' && collapsible === 'icon' && themeValue === 'system';

    const handleReset = () => {
        resetLayout();
        setTheme('system');
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer"
                    aria-label="Go back"
                >
                    <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                </button>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                        Appearance
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Theme mode and how the sidebar is laid out on your screen.
                    </p>
                </div>
            </div>

            {/* Theme mode card */}
            <section className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                    <SunIcon className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Theme
                    </h2>
                </div>

                <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-xs">
                    <div
                        role="radiogroup"
                        aria-label="Select theme mode"
                        className="grid grid-cols-3 gap-2 sm:gap-3"
                    >
                        {THEME_OPTIONS.map(({ value, label, Icon }) => {
                            const checked = themeValue === value;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    role="radio"
                                    aria-checked={checked}
                                    onClick={() => setTheme(value)}
                                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-bold transition-colors cursor-pointer ${
                                        checked
                                            ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
                                            : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" aria-hidden="true" />
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Sidebar style card */}
            <section className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                    <PaintBrushIcon className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Sidebar Style
                    </h2>
                </div>

                <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-xs">
                    <div
                        role="radiogroup"
                        aria-label="Select sidebar style"
                        className="grid grid-cols-3 gap-2 sm:gap-3"
                    >
                        {SIDEBAR_STYLE_OPTIONS.map(({ value, label, description }) => {
                            const checked = variant === value;
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    role="radio"
                                    aria-checked={checked}
                                    aria-label={`Select ${label.toLowerCase()}`}
                                    onClick={() => setVariant(value)}
                                    className={`flex flex-col gap-1.5 rounded-xl border p-2 text-left transition-colors cursor-pointer ${
                                        checked
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'border-border hover:border-primary/40'
                                    }`}
                                >
                                    <SidebarStylePreview value={value} />
                                    <span className="text-xs font-bold text-foreground">{label}</span>
                                    <span className="text-xs leading-snug text-muted-foreground">
                                        {description}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                        Sidebar styles apply on desktop screens.
                    </p>
                </div>
            </section>

            {/* Reset row */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
                <div>
                    <p className="text-sm font-bold text-foreground">Reset to defaults</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        System theme with the standard sidebar.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleReset}
                    disabled={isDefault}
                    className="inline-flex shrink-0 items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <ArrowPathIcon className="w-4 h-4" aria-hidden="true" />
                    Reset
                </button>
            </div>
        </div>
    );
}
