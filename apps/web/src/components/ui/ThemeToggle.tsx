'use client';

import { useTheme } from '@/features/system/components/providers/ThemeContext';
import SunIcon from '@heroicons/react/24/outline/SunIcon';
import MoonIcon from '@heroicons/react/24/outline/MoonIcon';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
         
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="w-10.5 h-10.5" />; // Placeholder to prevent mismatch
    }

    return (
        <button
            onClick={toggleTheme}
            className="group relative p-2.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200"
            aria-label="Toggle Theme"
        >
            <MoonIcon
                className={`w-5.5 h-5.5 transition-all duration-200 ${theme === 'light' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75 absolute inset-2.5'
                    }`}
            />
            <SunIcon
                className={`w-5.5 h-5.5 transition-all duration-200 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75 absolute inset-2.5'
                    }`}
            />
        </button>
    );
}


