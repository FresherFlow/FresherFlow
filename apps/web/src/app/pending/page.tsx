'use client';

import { useEffect, useState } from 'react';

function StatCard({ label, targetValue }: { label: string; targetValue: number }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTimestamp: number | null = null;
        const duration = 1500; // 1.5 seconds
        let animationFrameId: number;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            // easeOutQuad interpolation
            const easeProgress = progress * (2 - progress);
            
            setCount(Math.floor(easeProgress * targetValue));

            if (progress < 1) {
                animationFrameId = window.requestAnimationFrame(step);
            } else {
                setCount(targetValue);
            }
        };

        animationFrameId = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(animationFrameId);
    }, [targetValue]);

    return (
        <div className="rounded-xl border border-border bg-card/65 backdrop-blur p-6 shadow-sm flex flex-col justify-center transition-all hover:border-primary/20">
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {count.toLocaleString()}
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold mt-2 leading-tight">
                {label}
            </div>
        </div>
    );
}

export default function PendingPage() {
    return (
        <div className="min-h-[calc(100vh-4rem)] bg-background py-12 px-6">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                        Pending Dashboard
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Overview of current pending tasks, metrics, and operations queue.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Stats Cards */}
                    <div className="md:col-span-5 space-y-4">
                        <h2 className="text-lg font-bold text-foreground pb-2 border-b border-border/40">
                            Live Queue Stats
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            <StatCard label="Pending Payments" targetValue={150} />
                            <StatCard label="Patients in waiting room" targetValue={12} />
                            <StatCard label="Complaints" targetValue={5} />
                        </div>
                    </div>
                    
                    {/* Right Column: General Information / Queue Details */}
                    <div className="md:col-span-7 bg-card/45 border border-border/50 rounded-2xl p-6 md:p-8 space-y-6">
                        <div className="space-y-3">
                            <h3 className="text-xl font-bold text-foreground">Queue Management Details</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                This section displays active operational queues. Stats on the left show the count-up of pending metrics. As new events enter or leave the system, the queues are re-calculated.
                            </p>
                        </div>
                        <div className="border-t border-border/40 pt-6 space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-semibold text-muted-foreground">Queue Health Status</span>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500">
                                    Healthy
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-semibold text-muted-foreground">Last Synced</span>
                                <span className="text-muted-foreground">Just now</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
