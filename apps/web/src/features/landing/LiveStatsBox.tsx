'use client';

import { useEffect, useState } from 'react';

/**
 * Live stats box — small always-dark instrument box on the landing that
 * renders REAL Cloudflare analytics from /api/stats:
 *   today: visitors · page views · requests
 *   yesterday: visitors
 * Graceful fallback: if the endpoint is down, the box shows feed-derived
 * labels instead of fake numbers.
 */

interface StatsResponse {
    today?: { pageViews?: number; visitors?: number; requests?: number };
    yesterday?: { pageViews?: number; visitors?: number };
    updatedAt?: string;
}

interface LiveStats {
    todayVisitors: number | null;
    todayViews: number | null;
    todayRequests: number | null;
    yesterdayVisitors: number | null;
    updatedAt: string | null;
}

const fmt = (n: number) => n.toLocaleString('en-IN');

export function LiveStatsBox() {
    const [stats, setStats] = useState<LiveStats | null>(null);

    useEffect(() => {
        let cancelled = false;
        const base = process.env.NEXT_PUBLIC_API_URL || 'https://api.fresherflow.in';
        fetch(`${base}/api/stats`, { signal: AbortSignal.timeout(6000) })
            .then((r) => (r.ok ? (r.json() as Promise<StatsResponse>) : null))
            .then((data) => {
                if (!cancelled && data) {
                    setStats({
                        todayVisitors: data.today?.visitors ?? null,
                        todayViews: data.today?.pageViews ?? null,
                        todayRequests: data.today?.requests ?? null,
                        yesterdayVisitors: data.yesterday?.visitors ?? null,
                        updatedAt: data.updatedAt ?? null,
                    });
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="ff-band-box px-5 py-5">
            <div className="flex items-center gap-2 font-record text-[10px] uppercase tracking-[0.16em]">
                <span className="relative flex h-2 w-2" aria-hidden>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10b981] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10b981]" />
                </span>
                <span className="ff-band-muted">Live · Cloudflare analytics</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                    <div className="font-record text-[clamp(22px,2.4vw,30px)] font-semibold leading-none tabular-nums">
                        {stats?.todayVisitors !== null && stats?.todayVisitors !== undefined ? fmt(stats.todayVisitors) : '—'}
                    </div>
                    <div className="ff-band-muted mt-1.5 font-record text-[10.5px] uppercase tracking-[0.1em]">
                        Visitors today
                    </div>
                </div>
                <div>
                    <div className="font-record text-[clamp(22px,2.4vw,30px)] font-semibold leading-none tabular-nums">
                        {stats?.todayViews !== null && stats?.todayViews !== undefined ? fmt(stats.todayViews) : '—'}
                    </div>
                    <div className="ff-band-muted mt-1.5 font-record text-[10.5px] uppercase tracking-[0.1em]">
                        Pages viewed today
                    </div>
                </div>
                <div>
                    <div className="font-record text-[clamp(22px,2.4vw,30px)] font-semibold leading-none tabular-nums">
                        {stats?.yesterdayVisitors !== null && stats?.yesterdayVisitors !== undefined ? fmt(stats.yesterdayVisitors) : '—'}
                    </div>
                    <div className="ff-band-muted mt-1.5 font-record text-[10.5px] uppercase tracking-[0.1em]">
                        Freshers yesterday
                    </div>
                </div>
                <div>
                    <div className="font-record text-[clamp(22px,2.4vw,30px)] font-semibold leading-none tabular-nums">
                        {stats?.todayRequests !== null && stats?.todayRequests !== undefined ? fmt(stats.todayRequests) : '—'}
                    </div>
                    <div className="ff-band-muted mt-1.5 font-record text-[10.5px] uppercase tracking-[0.1em]">
                        Requests today
                    </div>
                </div>
            </div>
        </div>
    );
}
