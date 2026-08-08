import React from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

export const ExpiredWarning = () => {
    return (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3 md:p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="p-2 bg-destructive/10 rounded-full">
                <ClockIcon className="w-6 h-6 text-destructive" />
            </div>
            <div>
                <h3 className="text-sm font-bold text-destructive uppercase tracking-wide">Opportunity Expired</h3>
                <p className="text-sm md:text-base text-muted-foreground font-medium">
                    This listing is no longer accepting applications. It is visible for historical reference only.
                </p>
            </div>
        </div>
    );
};
