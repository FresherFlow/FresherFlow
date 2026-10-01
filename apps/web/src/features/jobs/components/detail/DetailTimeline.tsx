import { TimelineEventView } from '@/features/jobs/utils/detailUtils';
import { cn } from '@/ui/cn';
import { useMemo } from 'react';

interface DetailTimelineProps {
    timelineEvents: TimelineEventView[];
    upcomingTimelineEvents: TimelineEventView[];
}

export function DetailTimeline({ timelineEvents, upcomingTimelineEvents }: DetailTimelineProps) {
    /**
     * Past/upcoming is taken from the parent's list rather than from a second
     * clock here. A local `useState(() => Date.now())` froze at mount, so rows
     * never re-shaded; and even a live second clock would be sampled at a
     * different instant than the `upcoming` array, letting a row read as past
     * while the header counted it as upcoming. `upcomingTimelineEvents` is
     * exactly `timelineEvents` filtered against the one clock
     * `useOpportunityDerivedState` keeps current, so membership is that same
     * answer - no second source of time.
     */
    const upcomingIds = useMemo(
        () => new Set(upcomingTimelineEvents.map((event) => event.id)),
        [upcomingTimelineEvents]
    );

    if (timelineEvents.length === 0) return null;

    return (
        <div id="drive-timeline" className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2">
                <h3 className="text-sm md:text-base font-bold text-foreground/80 tracking-tight">Drive timeline</h3>
                {upcomingTimelineEvents.length > 0 && (
                    <span className="text-xs font-semibold text-primary">
                        {upcomingTimelineEvents.length} upcoming
                    </span>
                )}
            </div>
            <div className="space-y-2">
                {timelineEvents.map((event) => {
                    const isPast = !upcomingIds.has(event.id);
                    return (
                        <div
                            key={event.id}
                            className={cn(
                                "rounded-lg p-2.5",
                                isPast ? "bg-muted/20" : "bg-primary/5"
                            )}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm md:text-base font-semibold text-foreground">{event.title}</p>
                                <span className="text-sm font-semibold text-muted-foreground">
                                    {event._dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <p className="mt-1 text-sm font-bold text-foreground/70">{event.eventType.replace('_', ' ')}</p>
                            {event.notes ? (
                                <p className="mt-1 text-base md:text-base text-foreground leading-relaxed whitespace-pre-wrap font-medium">{event.notes}</p>
                            ) : null}
                            {event.sourceLink ? (
                                <a
                                    href={event.sourceLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex text-sm font-semibold text-primary hover:underline"
                                >
                                    Source update
                                </a>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
