import React from 'react';
import Link from 'next/link';

interface MobileGuestCTAProps {
    loginFromDetailHref: string;
}

export const MobileGuestCTA = ({ loginFromDetailHref }: MobileGuestCTAProps) => {
    return (
        <div className="md:hidden fixed bottom-4 left-3 right-3 z-40">
            <Link href={loginFromDetailHref}>
                <div className="bg-primary/95 backdrop-blur-md text-primary-foreground p-3 rounded-xl shadow-2xl flex items-center justify-between border border-primary/20 animate-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide">Join FresherFlow</p>
                        <p className="text-xs opacity-90">Unlock more verified listings.</p>
                    </div>
                    <div className="h-8 px-4 bg-card text-foreground border border-border rounded-lg flex items-center justify-center text-xs font-bold uppercase tracking-tight shadow-sm">
                        Sign Up Free
                    </div>
                </div>
            </Link>
        </div>
    );
};
