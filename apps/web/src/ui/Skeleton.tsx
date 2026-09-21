'use client';

import { cn } from "@/ui/cn";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
    /**
     * Shape variants — Skeleton owns the corner radius; call sites own sizing
     * through className (for example h-8 and w-24). 'default' keeps the base
     * `rounded` from the class list below, 'pill' is a fully round
     * chip/avatar, and 'panel' is a card/tile-scale block.
     */
    variant?: 'default' | 'pill' | 'panel';
};

/** Shape classes per variant. `default` adds nothing — the base already carries `rounded`. */
const VARIANT_CLASSES: Record<NonNullable<SkeletonProps['variant']>, string> = {
    default: '',
    pill: 'rounded-full',
    panel: 'rounded-lg',
};

export function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
    return (
        <div
            className={cn("animate-pulse rounded bg-muted", VARIANT_CLASSES[variant], className)}
            {...props}
        />
    );
}
