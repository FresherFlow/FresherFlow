'use client';

import React from 'react';
import Link from 'next/link';

interface DashboardSectionProps {
    title: string;
    description?: string;
    count?: number;
    icon?: React.ReactNode;
    viewAllHref?: string;
    viewAllLabel?: string;
    children: React.ReactNode;
    className?: string;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
    title,
    description,
    count,
    icon,
    viewAllHref,
    viewAllLabel = 'View all',
    children,
    className = '',
}) => {
    return (
        <section className={`space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out-strong motion-reduce:animate-none ${className}`}>
            <div className="flex flex-wrap items-start sm:items-center justify-between gap-3 pb-2.5 border-b border-border/30">
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    {icon && (
                        <div className="p-2 rounded-xl bg-muted/30 text-muted-foreground flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                            {icon}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <h2 className="font-display text-base md:text-lg font-bold tracking-tight leading-tight text-foreground">
                                {title}
                            </h2>
                            {count !== undefined && count > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground tabular-nums shrink-0">
                                    {count}
                                </span>
                            )}
                        </div>
                        {description && (
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-snug line-clamp-1">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {viewAllHref && (
                    <Link
                        href={viewAllHref}
                        className="group flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors duration-150 ease-out shrink-0 self-start sm:self-center mt-1 sm:mt-0 active:scale-95"
                    >
                        <span>{viewAllLabel}</span>
                        <span aria-hidden="true" className="inline-block transition-transform duration-150 ease-out group-hover:translate-x-0.5">&rarr;</span>
                    </Link>
                )}
            </div>

            <div>{children}</div>
        </section>
    );
};
