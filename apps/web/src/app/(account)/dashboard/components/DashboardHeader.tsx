import React from 'react';
import Link from 'next/link';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import { Button } from '@/ui/Button';


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
