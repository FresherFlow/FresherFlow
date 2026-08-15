'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';

const LIGHT_THEME_COLOR = '#e2eaf2'; // hsl(210 28% 92%)
const DARK_THEME_COLOR = '#0d0f14'; // hsl(222 20% 7%)

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider 
            attribute="class" 
            defaultTheme="system" 
            enableSystem
            disableTransitionOnChange
            {...props}
        >
            <ThemeMetaSync />
            {children}
        </NextThemesProvider>
    );
}

function ThemeMetaSync() {
    const { resolvedTheme } = useNextTheme();

    React.useEffect(() => {
        const metaThemeColor = document.getElementById('theme-color-meta') || document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor && resolvedTheme) {
            metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
        }
    }, [resolvedTheme]);

    return null;
}

export function useTheme() {
    const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme();
    
    const toggleTheme = async () => {
        const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
        if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setTheme(nextTheme);
            return;
        }

        document.documentElement.style.viewTransitionName = 'theme-transition';
        const transition = document.startViewTransition(() => {
            setTheme(nextTheme);
        });
        
        await transition.finished;
        document.documentElement.style.viewTransitionName = '';
    };

    return { theme, resolvedTheme, systemTheme, setTheme, toggleTheme };
}
