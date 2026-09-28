'use client';

import type { ReactNode } from 'react';
import { cn } from '@/ui/cn';
import { Button } from '@/ui/Button';

/**
 * Centered, non-scrolling error shell (shadcn-admin error-feature pattern:
 * giant code, message, action row). The PAGE never scrolls: the shell fills
 * its parent (`flex-1`) instead of claiming viewport units, so stacked
 * ancestors (mobile top bar padding, bottom tabs) can't push it into
 * overflow. Only the inner column may micro-scroll on short screens.
 * Pass `className="h-full min-h-0"` when nesting inside an already-tall
 * column — same fill, explicit height.
 */
export function ErrorState({
    code,
    title,
    message,
    children,
    className,
}: {
    code: string;
    title: string;
    message?: ReactNode;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex min-h-0 w-full flex-1 flex-col overflow-hidden', className)}>
            <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto">
            <div className="m-auto flex w-full max-w-2xl flex-col items-center gap-2 px-4 py-6 text-center">
                <h1 className="text-[7rem] font-bold leading-none tracking-tight">{code}</h1>
                <p className="font-medium">{title}</p>
                {message ? (
                    <p className="text-center text-sm text-muted-foreground">{message}</p>
                ) : null}
                {children ? <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div> : null}
            </div>
            </div>
        </div>
    );
}

export function ErrorStateButton({
    href,
    onClick,
    variant = 'default',
    children,
}: {
    href?: string;
    onClick?: () => void;
    variant?: 'default' | 'outline';
    children: ReactNode;
}) {
    if (href) {
        return (
            <Button variant={variant} asChild>
                <a href={href}>{children}</a>
            </Button>
        );
    }
    return (
        <Button variant={variant} onClick={onClick}>
            {children}
        </Button>
    );
}
