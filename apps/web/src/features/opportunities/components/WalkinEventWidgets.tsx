'use client';

import type { Opportunity } from '@fresherflow/types';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import { getGoogleCalendarUrl } from '@/features/opportunities/utils/walkinMapUtils';
import { formatNextWalkinLabel } from '@/features/opportunities/utils/walkinEventUtils';
import { cn } from '@repo/ui/utils/cn';

/**
 * Walk-in event widgets — additive layer for cards, rows, and panes.
 *
 * Layering rules honored (DESIGN_SYSTEM.md):
 * - Semantic tokens only (bg-warning/10, text-foreground, border-border) — dark mode free
 * - Composed from src/ui primitives; no business logic in ui/
 * - Motion budget: 150ms ease-out press feedback only
 * - Event handlers stopPropagation so card-level onClick never fires
 * - Buttons render as real <a> targets (Google Calendar / Maps) — no JS portals
 */

/** Next-drive date chip. Renders nothing when the drive has no upcoming date. */
export function WalkinDateChip({ opp, className }: { opp: Opportunity; className?: string }) {
    const label = formatNextWalkinLabel(opp);
    if (!label) return null;

    const isToday = label === 'Today';
    const isTomorrow = label === 'Tomorrow';

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 border',
                isToday
                    ? 'bg-destructive/10 text-destructive border-destructive/20'
                    : isTomorrow
                        ? 'bg-warning/10 text-warning border-warning/20'
                        : 'bg-primary/10 text-primary border-primary/20',
                className
            )}
        >
            <CalendarIcon className="w-3 h-3" />
            {label}
        </span>
    );
}

/** Compact event fact row: next date + time + venue, one line each. */
export function WalkinEventFacts({ opp, className }: { opp: Opportunity; className?: string }) {
    const d = opp.walkInDetails;
    if (!d) return null;

    const dateLabel = d.dateRange || (d.dates?.length ? new Date(d.dates[0]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null);

    return (
        <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground', className)}>
            {dateLabel && (
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <CalendarIcon className="w-3 h-3 shrink-0" />
                    {dateLabel}
                </span>
            )}
            {(d.timeRange || d.reportingTime) && (
                <span className="inline-flex items-center gap-1">
                    <ClockIcon className="w-3 h-3 shrink-0" />
                    {d.timeRange || d.reportingTime}
                </span>
            )}
            {d.venueAddress && (
                <span className="inline-flex items-center gap-1 min-w-0">
                    <MapPinIcon className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[14rem]">{d.landmark ? `${d.venueAddress.split(',')[0]} · ${d.landmark}` : d.venueAddress}</span>
                </span>
            )}
        </div>
    );
}

/** Calendar + Directions action row. Hidden when there is nothing to link. */
export function WalkinEventActions({ opp, compact = false, className }: { opp: Opportunity; compact?: boolean; className?: string }) {
    const d = opp.walkInDetails;
    if (!d) return null;

    const hasCoords = d.latitude !== undefined && d.longitude !== undefined;
    const dest = hasCoords ? `${d.latitude},${d.longitude}` : d.venueAddress || (opp.locations || []).join(', ');
    const directionsUrl =
        d.venueLink ||
        (dest ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}` : null);

    if (!directionsUrl) return null;

    return (
        <div className={cn('flex items-center gap-1.5', className)}>
            <a
                href={getGoogleCalendarUrl(opp)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label="Add drive to Google Calendar"
                className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-foreground font-semibold hover:bg-muted transition-colors active:scale-[0.97] duration-150 ease-out',
                    compact ? 'h-7 px-2 text-xs' : 'h-8 px-3 text-xs'
                )}
            >
                <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                Calendar
            </a>
            <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                aria-label="Get directions to venue"
                className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-foreground font-semibold hover:bg-muted transition-colors active:scale-[0.97] duration-150 ease-out',
                    compact ? 'h-7 px-2 text-xs' : 'h-8 px-3 text-xs'
                )}
            >
                <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                Directions
                <ArrowTopRightOnSquareIcon className="w-3 h-3 text-muted-foreground" />
            </a>
        </div>
    );
}
