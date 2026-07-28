import React from 'react';
import { cn } from '@repo/ui/utils/cn';

interface MatchScoreGaugeProps {
    score: number;
    size?: number;
    strokeWidth?: number;
    isEligible?: boolean;
    className?: string;
}

export function MatchScoreGauge({
    score,
    size = 48,
    strokeWidth = 4,
    isEligible = true,
    className
}: MatchScoreGaugeProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = score / 100;
    const offset = circumference - progress * circumference;

    const colorClass = isEligible ? "text-emerald-500" : "text-destructive";

    return (
        <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-muted-foreground/20"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    fill="transparent"
                    className={cn("transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] delay-150 starting:stroke-dashoffset-[var(--circumference)]", colorClass)}
                    style={{ "--circumference": circumference } as React.CSSProperties}
                />
            </svg>
            {size >= 35 && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn("font-bold", colorClass)} style={{ fontSize: size * 0.3 }}>
                        {score}%
                    </span>
                </div>
            )}
        </div>
    );
}
