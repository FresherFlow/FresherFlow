'use client';

import { cn } from "@/ui/cn";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
    /**
     * Shape variants — Skeleton owns the corner radius; call sites own sizing
     * through className (for example h-8 and w-24). 'default' keeps the base
     * `rounded` from the class list below, 'pill' is a fully round
     * chip/avatar, 'panel' is a card/tile-scale block, 'action' matches compact
     * button geometry, 'surface' is a bordered card surface, 'subtle' is the
     * lighter second line of a two-line text placeholder, and 'tabActive' is
     * the active tab underline placeholder.
     */
    variant?: 'default' | 'pill' | 'panel' | 'action' | 'surface' | 'subtle' | 'tabActive';
};

/** Shape classes per variant. `default` adds nothing — the base already carries `rounded`. */
const VARIANT_CLASSES: Record<NonNullable<SkeletonProps['variant']>, string> = {
    default: '',
    pill: 'rounded-full',
    panel: 'rounded-lg',
    action: 'rounded-md',
    surface: 'rounded-xl border border-border/60 bg-card',
    subtle: 'bg-muted/60',
    tabActive: 'border-b-2 border-primary',
};

export function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse motion-reduce:animate-none rounded bg-muted",
                VARIANT_CLASSES[variant],
                className
            )}
            {...props}
        />
    );
}
