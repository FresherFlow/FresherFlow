'use client';

import { cn } from '@/lib/utils/utils';
import { useEffect, useState } from 'react';

import Image from 'next/image';

interface LoadingScreenProps {
    message?: string;
    fullScreen?: boolean;
    className?: string;
}

export default function LoadingScreen({
    message = "Loading...",
    fullScreen = true,
    className
}: LoadingScreenProps) {
    const [displayMessage, setDisplayMessage] = useState(message);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            ((window.navigator as Navigator & { standalone?: boolean }).standalone === true);

        if (!isStandalone) {
            window.setTimeout(() => setDisplayMessage(message), 0);
            return;
        }

        const launchKey = 'ff_pwa_launch_text_seen';
        const launchSeen = window.sessionStorage.getItem(launchKey) === '1';
        if (!launchSeen) {
            window.setTimeout(() => setDisplayMessage('Opening FresherFlow...'), 0);
            window.sessionStorage.setItem(launchKey, '1');
        } else {
            window.setTimeout(() => setDisplayMessage(message), 0);
        }
    }, [message]);

    return (
        <div className={cn(
            "flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm z-50",
            fullScreen ? "fixed inset-0" : "absolute inset-0 min-h-[400px]",
            className
        )}>
            <div className="relative flex items-center justify-center mb-6">
                {/* Brand Pulsate Effect */}
                <div className="absolute w-24 h-24 bg-primary/10 rounded-full animate-ping opacity-20" />
                <div className="absolute w-16 h-16 bg-primary/20 rounded-full animate-pulse opacity-30" />

                {/* Logo - Light Mode */}
                <div className="relative w-12 h-12 z-10 dark:hidden">
                    <Image
                        src="/logo.png"
                        alt="Loading..."
                        fill
                        sizes="48px"
                        className="object-contain"
                        suppressHydrationWarning
                    />
                </div>

                {/* Logo - Dark Mode */}
                <div className="relative w-12 h-12 z-10 hidden dark:block">
                    <Image
                        src="/logo-white.png"
                        alt="Loading..."
                        fill
                        sizes="48px"
                        className="object-contain"
                        suppressHydrationWarning
                    />
                </div>
            </div>

            {displayMessage && (
                <div className="text-center animate-pulse space-y-2">
                    <p className="text-lg font-bold text-foreground tracking-tight">{displayMessage}</p>
                    <p className="text-[10px] text-muted-foreground capitalize tracking-[0.2em] font-bold">FresherFlow</p>
                </div>
            )}
        </div>
    );
}
