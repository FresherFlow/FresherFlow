'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/ui/cn';

/**
 * One frame for every card on the For You dashboard.
 *
 * The dashboard is a grid of same-sized cards, so the frame lives here instead
 * of in each card: a title row, a hairline divider, then the body. A card then
 * only describes its own data, and adding a card cannot invent a new look.
 *
 * Same surface as ProfileStrengthCard (rounded-2xl, border-border/70, bg-card,
 * shadow-sm) because both sit in the same grid.
 */
export function DashboardCard({
    title,
    action,
    children,
    className,
}: {
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm', className)}>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
                <h2 className="text-base font-semibold leading-tight text-foreground">{title}</h2>
                {action}
            </div>
            <div className="border-t border-border/70 p-5">{children}</div>
        </section>
    );
}

/** The standard "View all" affordance in a card header. */
export function DashboardCardLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link href={href} className="shrink-0 text-xs font-semibold text-primary hover:underline">
            {children}
        </Link>
    );
}

/**
 * The body of a card that has nothing to show yet.
 *
 * Left-aligned and text-height on purpose: an empty card is a state, not an
 * event, so it gets no dashed frame, no icon and no vertical centring. The
 * compact body also lets a card sit in a grid row without stretching it.
 */
export function DashboardEmpty({
    message,
    action,
}: {
    message: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">{message}</p>
            {action}
        </div>
    );
}

/**
 * A number the user can act on. Links out to the list it counts, because a stat
 * you cannot open is decoration.
 */
export function DashboardStat({
    label,
    value,
    href,
}: {
    label: string;
    value: string | number;
    href?: string;
}) {
    const content = (
        <>
            <span className="block text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className="mt-0.5 block text-2xl font-semibold tabular-nums text-foreground">{value}</span>
        </>
    );

    if (!href) return <div>{content}</div>;

    return (
        <Link
            href={href}
            aria-label={`${label}: ${value}`}
            className="-m-1 block rounded-lg p-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            {content}
        </Link>
    );
}
