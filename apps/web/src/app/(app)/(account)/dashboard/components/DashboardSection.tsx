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
        <section className={`space-y-4 ${className}`}>
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/40">
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className="p-2 rounded-xl bg-muted/30 text-muted-foreground flex items-center justify-center shrink-0">
                            {icon}
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base md:text-lg font-bold tracking-tight text-foreground">
                                {title}
                            </h2>
                            {count !== undefined && count > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                                    {count}
                                </span>
                            )}
                        </div>
                        {description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {viewAllHref && (
                    <Link
                        href={viewAllHref}
                        className="group flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors shrink-0"
                    >
                        <span>{viewAllLabel}</span>
                        <span className="inline-block transition-transform group-hover:translate-x-0.5">&rarr;</span>
                    </Link>
                )}
            </div>

            <div>{children}</div>
        </section>
    );
};
