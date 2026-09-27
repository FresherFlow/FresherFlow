'use client';

import type { ReactNode } from 'react';
import { cn } from '@/ui/cn';
import { Button } from '@/ui/Button';

/**
 * Centered, non-scrolling error shell (shadcn-admin error-feature pattern:
 * giant code, message, action row). `h-dvh overflow-hidden` — error pages
 * must never scroll; the old marketing-style 404 grew past the viewport.
 * Pass `className="h-full"` when nesting inside an already-constrained
 * shell column (e.g. the admin layout).
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
        <div className={cn('h-dvh w-full overflow-hidden', className)}>
            <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center gap-2 px-4 text-center">
                <h1 className="text-[7rem] font-bold leading-none tracking-tight">{code}</h1>
                <p className="font-medium">{title}</p>
                {message ? (
                    <p className="text-center text-sm text-muted-foreground">{message}</p>
                ) : null}
                {children ? <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div> : null}
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
