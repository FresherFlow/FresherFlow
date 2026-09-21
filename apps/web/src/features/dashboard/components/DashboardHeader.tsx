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
        <div className="pb-1 md:pb-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                {greeting}{nameText}.
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">What would you like to do next?</p>
        </div>
    );
};
