'use client';

import { useEffect, useState } from 'react';

/**
 * Announcement marquee at the top of the landing page (mock: dark strip with
 * mono facts separated by ·). Feed facts come from the server; /api/stats is
 * fetched here and handed to the parent via onStats so the numbers can be
 * rendered on the page (LiveStatsBox) — NOT in the strip itself.
 *
 * Loop math: the CSS animation translates the track by -50%. To loop without
 * a visible gap the track must be TWO IDENTICAL HALVES. Reduced motion
 * renders the first half statically.
 *
 * Zero-guards: when there are no new jobs / no walk-ins this week, the item
 * swaps to a calm always-true fact instead of showing "0 new".
 *
 * Top behavior: shows ONLY at the top of the page. Past 120px it slides away
 * and stays away (shared useMarqueeHidden hook, same number in DesktopNav).
 */

interface LandingMarqueeProps {
    newToday: number;
    refreshedAt: Date | null;
    walkins: number;
    onStats?: (stats: { visitors: number | null; pageViews: number | null }) => void;
}

interface StatsResponse {
    today?: { pageViews?: number; visitors?: number; requests?: number };
    yesterday?: { pageViews?: number; visitors?: number };
    updatedAt?: string;
}

function formatAge(date: Date): string {
    const mins = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

import { useMarqueeHidden } from '@/hooks/useMarqueeHidden';

export function LandingMarquee({ newToday, refreshedAt, walkins, onStats }: LandingMarqueeProps) {
    const hidden = useMarqueeHidden(true);

    useEffect(() => {
        let cancelled = false;
        const base = process.env.NEXT_PUBLIC_API_URL || 'https://api.fresherflow.in';
        fetch(`${base}/api/stats`, { signal: AbortSignal.timeout(6000) })
            .then((r) => (r.ok ? (r.json() as Promise<StatsResponse>) : null))
            .then((data) => {
                if (!cancelled && data) {
                    onStats?.({
                        visitors: data.yesterday?.visitors ?? null,
                        pageViews: data.today?.pageViews ?? null,
                    });
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [onStats]);

    const items = [
        newToday > 0 ? (
            <span key="new">
                · <b className="font-semibold text-[var(--ff-accent)]">{newToday} new opportunities</b> posted today
            </span>
        ) : (
            <span key="new-alt">· Community-verified openings, refreshed on publish</span>
        ),
        <span key="age">· Board refreshed {refreshedAt ? formatAge(refreshedAt) : 'recently'}</span>,
        walkins > 0 ? (
            <span key="walkins">
                · Walk-in drives this week: <b className="font-semibold text-[var(--ff-accent)]">{walkins}</b>
            </span>
        ) : (
            <span key="walkins-alt">· Direct official apply links — zero redirects</span>
        ),
        <span key="free">· Free for freshers, forever</span>,
        <span key="checked">· Every link checked daily</span>,
    ];

    const half = [...items, ...items, ...items];
    const track = [...half, ...half];

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-[110] hidden h-7 overflow-hidden border-b border-[var(--ff-band-line)] bg-[var(--ff-band-bg)] text-[var(--ff-band-ink)] select-none transition-transform duration-300 ease-out lg:block ${
                hidden ? '-translate-y-full' : 'translate-y-0'
            }`}
            aria-hidden
        >
            <div className="ff-marquee-track font-record text-[11px] leading-7 tracking-[0.08em]">
                {track.map((item, i) => (
                    <span key={i} className="inline-flex items-center">
                        {item}
                    </span>
                ))}
            </div>
        </div>
    );
}
