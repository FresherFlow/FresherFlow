import React from 'react';
import { cn } from '@/lib/utils';

interface ProfileStatusCardProps {
    pct: number;
    className?: string;
}

export const ProfileStatusCard = ({ pct, className }: ProfileStatusCardProps) => {
    const isComplete = pct >= 100;
    
    return (
        <div className={cn("bg-card rounded-xl border border-border/60 shadow-sm p-4 flex items-center gap-4", className)}>
            <div className="w-12 h-12 rounded-full border-2 border-primary/20 bg-primary/5 flex items-center justify-center relative overflow-hidden shrink-0">
                <span className="text-xs font-bold text-primary relative z-10">{pct}%</span>
                <div 
                    className="absolute bottom-0 left-0 right-0 bg-primary/20 transition-all duration-700 z-0" 
                    style={{ height: `${pct}%` }} 
                />
            </div>
            <div>
                <h3 className="text-sm md:text-base font-bold text-foreground">Profile Status</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    {isComplete ? "Looking great! You're fully setup." : "Complete your details to rank higher."}
                </p>
            </div>
        </div>
    );
};
