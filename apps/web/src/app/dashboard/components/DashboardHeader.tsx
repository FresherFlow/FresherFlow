import React from 'react';
import Link from 'next/link';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import { Button } from '@/components/ui/Button';
import { ReferralLinkButton } from '@/components/dashboard/DashboardBanners';

interface DashboardHeaderProps {
    userName?: string;
}

export const DashboardHeader = ({ userName }: DashboardHeaderProps) => {
    return (
        <div className="flex flex-col gap-1.5 md:gap-3 pb-2.5 md:pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
                <div className="space-y-1">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                        Welcome back, {userName || 'candidate'}.
                    </h1>
                    <p className="text-[11px] md:text-xs text-muted-foreground">Move fast on verified listings.</p>
                </div>
                <div className="hidden md:flex flex-wrap items-center gap-2">
                    <ReferralLinkButton />
                    <Button asChild className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest">
                        <Link href="/opportunities">
                            <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                            Open feed
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest">
                        <Link href="/profile">
                            <UserIcon className="w-4 h-4 mr-2" />
                            Update profile
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
};
