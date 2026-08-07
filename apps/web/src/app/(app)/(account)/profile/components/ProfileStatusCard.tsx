'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/ui/cn';
import { Button } from '@/ui/Button';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface ProfileStatusCardProps {
    pct: number;
    username?: string;
    className?: string;
}

export const ProfileStatusCard = ({ pct, username, className }: ProfileStatusCardProps) => {
    const isComplete = pct >= 100;
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (pct / 100) * circumference;

    return (
        <div className={cn('w-full bg-card rounded-xl border border-border/60 shadow-sm p-5', className)}>
            <div className="flex items-center gap-4 mb-4">
                <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="28" cy="28" r={radius} className="stroke-muted/50 fill-none" strokeWidth="4" />
                        <circle
                            cx="28" cy="28" r={radius}
                            className={cn("fill-none transition-all duration-1000", isComplete ? "stroke-primary" : "stroke-primary/70")}
                            strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                        />
                    </svg>
                    <span className="absolute text-sm font-bold text-foreground">{pct}%</span>
                </div>
                <div>
                    <h3 className="text-sm font-bold text-foreground">Profile Strength</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {isComplete ? 'Market ready.' : 'Complete all sections.'}
                    </p>
                </div>
            </div>
            {username && (
                <Button asChild variant="secondary" size="sm" className="w-full h-9">
                    <Link href={`/u/${username}`} target="_blank" rel="noopener noreferrer">
                        View Profile <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                </Button>
            )}
        </div>
    );
};
