'use client';

import { useState } from 'react';
import Image from 'next/image';

const SCREENS = [
    {
        id: 'explore',
        title: 'Explore',
        image: '/screenshots/discover.jpg',
    },
    {
        id: 'details',
        title: 'Details',
        image: '/screenshots/details.jpg',
    },
    {
        id: 'saved',
        title: 'Saved',
        image: '/screenshots/shares.jpg',
    },
    {
        id: 'actions',
        title: 'Actions',
        image: '/screenshots/overlay.jpg',
    },
];

export default function DownloadMockup() {
    const [activeTab, setActiveTab] = useState(SCREENS[0].id);

    return (
        <div className="flex flex-col items-center justify-center gap-6 w-full max-w-xs mx-auto">
            {/* Phone Mockup Frame */}
            <div className="relative shrink-0 w-[170px] xs:w-[190px] sm:w-[230px] md:w-[250px] aspect-[9/20] rounded-[2rem] sm:rounded-[2.5rem] border-[5px] sm:border-[6px] border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden">
                {/* Speaker Notch */}
                <div className="absolute top-0 inset-x-0 h-4 sm:h-5 bg-zinc-800 flex items-center justify-center z-20">
                    <div className="w-8 sm:w-10 h-0.5 bg-zinc-700 rounded-full" />
                </div>

                {/* Screen Content Wrapper */}
                <div className="relative w-full h-full pt-4 sm:pt-5 select-none bg-zinc-950">
                    {SCREENS.map((screen) => (
                        <div
                            key={screen.id}
                            className={`absolute inset-0 pt-4 sm:pt-5 transition-all duration-500 ease-in-out ${
                                screen.id === activeTab
                                    ? 'opacity-100 scale-100 translate-y-0 z-10'
                                    : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
                            }`}
                        >
                            <Image
                                src={screen.image}
                                alt={screen.title}
                                fill
                                sizes="(max-width: 768px) 170px, 250px"
                                className="object-cover object-top"
                                priority
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* UNIFIED INTERACTIVE PREVIEW TABS: Horizontal pills underneath for both Mobile and Desktop */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap w-full px-2">
                {SCREENS.map((screen) => {
                    const isActive = screen.id === activeTab;

                    return (
                        <button
                            key={screen.id}
                            onMouseEnter={() => setActiveTab(screen.id)}
                            onClick={() => setActiveTab(screen.id)}
                            className={`px-3.5 py-1.5 rounded-full text-[10px] md:text-[11px] font-bold tracking-wide border transition-all duration-300 ${
                                isActive
                                    ? 'bg-primary/10 border-primary/40 text-primary shadow-sm'
                                    : 'bg-zinc-900/30 border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
                            }`}
                        >
                            {screen.title}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
