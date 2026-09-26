'use client';

import React, { useEffect, useState } from 'react';

interface DashboardHeaderProps {
    userName?: string;
}

export const DashboardHeader = ({ userName }: DashboardHeaderProps) => {
    const [greeting, setGreeting] = useState('Good morning');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            setGreeting('Good morning');
        } else if (hour >= 12 && hour < 17) {
            setGreeting('Good afternoon');
        } else {
            setGreeting('Good evening');
        }
    }, []);

    const nameText = userName ? `, ${userName}` : '';

    return (
        <div className="min-w-0 flex-1 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none">
            <h1 className="font-display text-xl md:text-2xl font-extrabold tracking-tight leading-tight text-foreground">
                {greeting}{nameText}.
            </h1>
            <p className="text-sm text-muted-foreground mt-1 leading-snug">What would you like to do next?</p>
        </div>
    );
};
