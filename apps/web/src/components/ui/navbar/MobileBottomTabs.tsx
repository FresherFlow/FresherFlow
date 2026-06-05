'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { getNavRoutes } from './routeConfig';


export function MobileBottomTabs() {
    const pathname = usePathname();
    const context = useContext(AuthContext);
    const user = context?.user;
    const [isVisible, setIsVisible] = useState(true);
    const mobileTabs = getNavRoutes().filter(r => r.showInMobileTabs);

    useEffect(() => {
        if (!user) return;

        let lastY = window.scrollY;

        const handleScroll = () => {
            const currentY = window.scrollY;

            if (currentY < 64) setIsVisible(true);
            else if (currentY > lastY + 6) setIsVisible(false);
            else if (currentY < lastY - 6) setIsVisible(true);

            lastY = currentY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [user]);

    if (!user) return null;

    return (
        <div className={cn(
            'md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-t border-border z-50 transition-transform duration-200',
            isVisible ? 'translate-y-0' : 'translate-y-full'
        )}>
            <div className="flex justify-around items-center h-full px-0">
                {mobileTabs.map((tab) => {
                    const isActive = pathname.startsWith(tab.href);
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            onClick={(event) => {
                                if (isActive) event.preventDefault();
                            }}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                'flex flex-col items-center justify-center flex-1 h-full gap-1',
                                isActive ? 'text-primary' : 'text-muted-foreground'
                            )}
                        >
                            <div className={cn('p-1 rounded-xl', isActive && 'bg-primary/10')}>
                                {Icon && (
                                    <Icon
                                        className={cn('w-6 h-6', isActive && 'fill-primary/20')}
                                        strokeWidth={isActive ? 2 : 1.5}
                                    />
                                )}
                            </div>
                            <span className={cn('text-xs', isActive ? 'font-semibold' : 'font-normal')}>
                                {tab.mobileLabel ?? tab.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
