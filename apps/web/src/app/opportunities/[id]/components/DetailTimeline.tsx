import { TimelineEventView } from '../detailUtils';
import { cn } from '@/shared/ui/cn';
import { useState } from 'react';

interface DetailTimelineProps {
    timelineEvents: TimelineEventView[];
    upcomingTimelineEvents: TimelineEventView[];
}

export function DetailTimeline({ timelineEvents, upcomingTimelineEvents }: DetailTimelineProps) {
    const [now] = useState(() => Date.now());

    if (timelineEvents.length === 0) return null;

    return (
        <div id="drive-timeline" className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2">
                <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-muted-foreground">Drive timeline</h3>
                {upcomingTimelineEvents.length > 0 && (
                    <span className="text-xs font-semibold text-primary">
                        {upcomingTimelineEvents.length} upcoming
                    </span>
                )}
            </div>
            <div className="space-y-2">
                {timelineEvents.map((event) => {
                    const isPast = event._dt.getTime() < now;
                    return (
                        <div
                            key={event.id}
                            className={cn(
                                "rounded-lg border p-2.5",
                                isPast ? "border-border/70 bg-muted/20" : "border-primary/20 bg-primary/5"
                            )}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm md:text-base font-semibold text-foreground">{event.title}</p>
                                <span className="text-sm font-semibold text-muted-foreground">
                                    {event._dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground uppercase tracking-wide">{event.eventType.replace('_', ' ')}</p>
                            {event.notes ? (
                                <p className="mt-1 text-sm md:text-base text-foreground/80 leading-relaxed whitespace-pre-wrap">{event.notes}</p>
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
