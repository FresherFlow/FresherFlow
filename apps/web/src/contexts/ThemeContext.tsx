'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const LIGHT_THEME_COLOR = '#e2eaf2'; // hsl(210 28% 92%)
const DARK_THEME_COLOR = '#0d0f14'; // hsl(222 20% 7%)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light');

    useEffect(() => {
        // Sync with the class applied by ThemeScript (which runs before hydration)
        const isDark = document.documentElement.classList.contains('dark');
         
        setTheme(isDark ? 'dark' : 'light');

        // Ensure state and storage are consistent
        const savedTheme = localStorage.getItem('theme') as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        }
    }, []);

    const setThemeColor = (newTheme: string) => {
        const metaThemeColor = document.getElementById('theme-color-meta') || document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', newTheme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.documentElement.classList.add('theme-transition');
            window.setTimeout(() => {
                document.documentElement.classList.remove('theme-transition');
            }, 250);
        }
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
        // Keep PWA status bar in sync with the app chrome.
        setThemeColor(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

