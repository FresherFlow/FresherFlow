'use client';


import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { LogoImage } from '@/lib/navigation/LogoImage';
import { ThemeSwitcher } from '@/ui/ThemeSwitcher';
import { useTheme } from '@/lib/providers/ThemeContext';
import { SITE_URL } from '@/lib/utils/runtimeConfig';

export function AuthHeader() {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="w-full h-16 px-4 md:px-8 border-b border-border/50 bg-background/80 backdrop-blur-md flex items-center justify-between z-20 shrink-0">
            <a
                href={SITE_URL || "/"}
                className="flex items-center gap-2.5 hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
            >
                <LogoImage width={28} height={28} className="w-7 h-7 object-contain" />
                <span className="text-lg font-bold text-foreground tracking-tight">FresherFlow</span>
            </a>

            <div className="flex items-center gap-3 md:gap-4">
                <ThemeSwitcher/>
            </div>
        </header>
    );
}
