'use client';

import { cn } from '@/lib/utils/utils';
import { useEffect, useState } from 'react';
import { LogoImage } from '@/lib/navigation/LogoImage';

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
            "flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm",
            fullScreen ? "fixed inset-0 z-[100]" : "absolute inset-0 z-40 min-h-[400px]",
            className
        )}>
            <div className="relative flex items-center justify-center mb-5">
                {/* Brand Logo - Same as User Site */}
                <div className="animate-pulse">
                    <LogoImage width={36} height={36} className="w-9 h-9" />
                </div>
            </div>

            {displayMessage && (
                <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-foreground tracking-tight">{displayMessage}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">FresherFlow</p>
                </div>
            )}
        </div>
    );
}
