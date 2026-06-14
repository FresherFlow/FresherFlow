'use client';

import { ShieldCheckIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Button } from '@/ui/Button';
import Link from 'next/link';

interface ProfileReadinessRequiredProps {
    percentage: number;
    message: string;
}

export function ProfileReadinessRequired({ percentage, message }: ProfileReadinessRequiredProps) {
    return (
        <div className="p-10 md:p-16 text-center rounded-3xl border border-border bg-card/80 shadow-2xl">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheckIcon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground tracking-tight mb-2">
                Profile Readiness Required
            </h3>
            <div className="max-w-md mx-auto space-y-6">
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    {message}
                </p>
                <div className="bg-muted/40 p-6 rounded-2xl border border-border">
                    <div className="flex items-center justify-center gap-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-primary">{percentage}%</div>
                            <div className="text-[10px] text-muted-foreground font-bold capitalize tracking-[0.15em] mt-1">Current</div>
                        </div>
                        <div className="w-px h-10 bg-border" />
                        <div className="text-center">
                            <div className="text-3xl font-bold text-foreground">100%</div>
                            <div className="text-[10px] text-muted-foreground font-bold capitalize tracking-[0.15em] mt-1">Goal</div>
                        </div>
                    </div>
                </div>
                <Button asChild className="h-12 px-8 text-sm font-bold capitalize tracking-widest">
                    <Link href="/profile">
                        Complete Profile
                        <ChevronRightIcon className="w-4 h-4 ml-2" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}
