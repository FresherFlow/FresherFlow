import React from 'react';


interface DashboardHeaderProps {
    userName?: string;
}

export const DashboardHeader = ({ userName }: DashboardHeaderProps) => {
    return (
        <div className="pb-2 md:pb-4">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                Welcome back, {userName || 'candidate'}.
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Move fast on verified listings.</p>
        </div>
    );
};
