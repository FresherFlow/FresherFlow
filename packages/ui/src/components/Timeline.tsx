import React from 'react';

export interface TimelineEvent {
    label: string;
    date: string;
    description?: string;
}

export interface TimelineProps {
    events: TimelineEvent[];
    className?: string;
}

export function Timeline({ events, className = '' }: TimelineProps) {
    if (!events || events.length === 0) {
        return (
            <div className="text-sm text-muted-foreground p-4 text-center border border-dashed border-border rounded-lg">
                No dates listed.
            </div>
        );
    }

    return (
        <div className={`flex flex-col ${className}`}>
            {events.map((event, idx) => (
                <div key={idx} className="flex gap-4 group">
                    {/* Visual dot & line indicator column */}
                    <div className="flex flex-col items-center flex-shrink-0">
                        {/* Dot */}
                        <div className="w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center transition-all group-hover:scale-110 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        {/* Line */}
                        {idx < events.length - 1 && (
                            <div className="w-0.5 flex-1 bg-border my-1" />
                        )}
                    </div>
                    <div className="flex-1 pb-6">
                        <div className="flex justify-between items-start gap-4">
                            <div className="space-y-0.5">
                                <h4 className="text-sm font-semibold text-foreground leading-snug">
                                    {event.label}
                                </h4>
                                {event.description && (
                                    <p className="text-xs text-muted-foreground leading-normal">
                                        {event.description}
                                    </p>
                                )}
                            </div>
                            <span className="text-sm font-bold text-primary shrink-0 whitespace-nowrap text-right mt-0.5">
                                {event.date}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
