'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { LogoImage } from '@/lib/navigation/LogoImage';
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import { useTheme } from '@/lib/providers/ThemeContext';

export function AuthHeader() {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="w-full h-16 px-4 md:px-8 border-b border-border/50 bg-background/80 backdrop-blur-md flex items-center justify-between z-20 shrink-0">
            <Link
                href="/"
                className="flex items-center gap-2.5 hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
            >
                <LogoImage width={28} height={28} className="w-7 h-7 object-contain" />
                <span className="text-lg font-bold text-foreground tracking-tight">FresherFlow</span>
            </Link>

            <div className="flex items-center gap-3 md:gap-4">
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                <div className="h-4 w-px bg-border/60" />
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    <span>Back to Home</span>
                </Link>
            </div>
        </header>
    );
}
