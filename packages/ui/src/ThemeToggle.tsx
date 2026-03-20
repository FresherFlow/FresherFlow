'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react'; // WEB-SAFE VERSION

interface ThemeToggleProps {
    theme?: 'light' | 'dark';
    toggleTheme: () => void;
    className?: string;
}

export function ThemeToggle({ theme, toggleTheme, className = '' }: ThemeToggleProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="w-10 h-10" />;
    }

    return (
        <button
            onClick={toggleTheme}
            className={`group relative p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200 ${className}`}
            aria-label="Toggle Theme"
        >
            <div className="relative w-5 h-5 flex items-center justify-center">
                <div className={`absolute transition-all duration-200 ${theme === 'light' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'}`}>
                    <Moon size={18} />
                </div>
                <div className={`absolute transition-all duration-200 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75'}`}>
                    <Sun size={18} />
                </div>
            </div>
        </button>
    );
}
