import React from 'react';

interface DashboardPulseProps {
    jobsCount: number;
    internshipsCount: number;
    walkinsCount: number;
    totalActive: number;
}

export const DashboardPulse = ({
    jobsCount,
    internshipsCount,
    walkinsCount,
    totalActive
}: DashboardPulseProps) => {
    const pulseItems = [
        { label: 'Jobs', count: jobsCount },
        { label: 'Internships', count: internshipsCount },
        { label: 'Walk-ins', count: walkinsCount },
    ];

    return (
        <section className="space-y-4 min-h-50">
            <h2 className="text-sm font-bold capitalize tracking-wider">Activity Pulse</h2>
            <div className="p-5 rounded-2xl border border-border bg-card/50 space-y-4">
                {pulseItems.map(item => (
                    <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs md:text-sm">
                            <span>{item.label}</span>
                            <span>{item.count}</span>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary/60"
                                style={{ width: `${Math.min(100, (item.count / totalActive) * 100)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
