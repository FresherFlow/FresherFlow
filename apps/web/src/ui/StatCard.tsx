import * as React from 'react'
import { cn } from '@/ui/cn'
import { Card } from '@/ui/Card'

/**
 * Compact metric tile: label, value, optional icon and caption.
 *
 * `Card` is a section card - `p-6` with a `text-xl` title - so stat tiles
 * built from `CardHeader` + `CardTitle` had to override padding and font-size
 * at every call site, which is what `shadcn/no-restyle` flags. Four admin
 * pages were doing exactly that. This encodes the compact geometry once so
 * call sites pass content only.
 *
 * Geometry follows the shadcn-admin dashboard tile (`CardHeader` row of
 * `text-sm font-medium` title + `h-4 w-4 text-muted-foreground` icon over a
 * `text-2xl font-bold` value and a `text-xs` caption). Spacing is owned here
 * via a single inner column, so `Card` is never restyled.
 */
export interface StatCardProps {
    /** Short noun phrase. Sits on one line at phone width. */
    label: string
    value: React.ReactNode
    icon?: React.ComponentType<{ className?: string }>
    /**
     * Optional supporting line. Prefer a fact (data window, cadence) over a
     * delta we cannot compute - these counters are point-in-time reads, so
     * "+20% from last month" would be invented.
     */
    caption?: React.ReactNode
    /** Caller escape hatch, e.g. `hidden sm:block` to drop it on phones. */
    captionClassName?: string
    className?: string
}

export function StatCard({
    label,
    value,
    icon: Icon,
    caption,
    captionClassName,
    className,
}: StatCardProps) {
    return (
        <Card className={className}>
            <div className="flex flex-col gap-1.5 p-6">
                <div className="flex flex-row items-center justify-between gap-2">
                    <p className="text-sm font-medium leading-tight text-card-foreground">{label}</p>
                    {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
                </div>
                <p className="mt-1 text-2xl font-bold leading-none tabular-nums">{value}</p>
                {caption ? (
                    <p className={cn('text-xs text-muted-foreground', captionClassName)}>{caption}</p>
                ) : null}
            </div>
        </Card>
    )
}
