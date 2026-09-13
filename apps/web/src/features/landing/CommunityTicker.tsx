'use client';

import { useEffect, useState } from 'react';

export interface TickerEvent {
    id: string;
    text: string;
}

/**
 * The community ticker (plan 16 §16.8): the landing's proof strip, fed only by
 * events the board can actually vouch for. The landing page builds these from
 * real feed fields, so an empty board renders one honest line rather than
 * invented activity. Decorative for assistive tech; the data is real.
 */
export function CommunityTicker({ events }: { events: TickerEvent[] }) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (events.length < 2) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const timer = window.setInterval(() => {
            setIndex((current) => (current + 1) % events.length);
        }, 4000);
        return () => window.clearInterval(timer);
    }, [events.length]);

    if (events.length === 0) {
        return (
            <p className="font-record text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Be the first to confirm an opening today
            </p>
        );
    }

    const event = events[index % events.length];

    return (
        <div
            aria-live="off"
            className="flex min-h-5 items-center gap-2 overflow-hidden font-record text-[11px] text-muted-foreground tabular-nums"
        >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-pin" aria-hidden="true" />
            <span key={event.id} className="truncate animate-fade-up motion-reduce:animate-none">
                {event.text}
            </span>
        </div>
    );
}
