'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import ChevronUpIcon from '@heroicons/react/24/solid/ChevronUpIcon';

export function ScrollToTop() {
    const [visible, setVisible] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > 400);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    if (!visible || pathname?.startsWith('/admin')) return null;

    return (
        <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Scroll to top"
            className="fixed bottom-[5.5rem] md:bottom-8 right-4 md:right-20 z-[70] flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
        >
            <ChevronUpIcon className="w-5 h-5" />
        </button>
    );
}
