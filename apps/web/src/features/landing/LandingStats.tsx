'use client';

import { useEffect, useState } from 'react';
import { CDN_URL } from '@/lib/utils/runtimeConfig';

interface LandingStatsProps {
    initialLiveCount: number;
    initialCompaniesCount: number;
}

export function LandingStats({ initialLiveCount, initialCompaniesCount }: LandingStatsProps) {
    const [liveCount, setLiveCount] = useState(initialLiveCount || 0);
    const [companiesCount, setCompaniesCount] = useState(initialCompaniesCount || 0);
    const [visitorsCount, setVisitorsCount] = useState(0);
    
    const [animatedLive, setAnimatedLive] = useState(0);
    const [animatedCompanies, setAnimatedCompanies] = useState(0);
    const [animatedVisitors, setAnimatedVisitors] = useState(0);

    useEffect(() => {
        // Capture initial values so the catch fallback doesn't close over state
        const initialLive = liveCount;
        const initialCompanies = companiesCount;

        if (!CDN_URL) return;

        // Fetch fresh stats from R2/CDN stats.json (lightweight, ~100 bytes)
        fetch(`${CDN_URL}/meta/stats.json`)
            .then(async (res) => {
                if (!res.ok) return;
                const data = await res.json();
                if (data && typeof data.opportunities === 'number') {
                    setLiveCount(data.opportunities);
                }
                if (data && typeof data.companies === 'number') {
                    setCompaniesCount(data.companies);
                }
            })
            .catch(() => {
                // Keep initial live counts from server render if CDN is unreachable
                if (initialLive > 0) setLiveCount(initialLive);
                if (initialCompanies > 0) setCompaniesCount(initialCompanies);
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // Fetch daily visitors from same-origin /api/stats (Cloudflare Analytics,
        // cached 5min at edge). Relative URL keeps staging/preview working.
        fetch('/api/stats')
            .then(async (res) => {
                if (!res.ok) return;
                const data = await res.json() as {
                    today?: { visitors?: unknown };
                    yesterday?: { visitors?: unknown };
                };
                const pick = (v: unknown): number | null =>
                    typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1_000_000_000
                        ? Math.floor(v)
                        : null;
                setVisitorsCount(
                    pick(data?.today?.visitors) ?? pick(data?.yesterday?.visitors) ?? 0
                );
            })
            .catch(() => {
                // Keep '- -' placeholder if stats endpoint is unreachable
            });
    }, []);


    useEffect(() => {
        if (liveCount === 0) return;
        
        let startTimestamp: number | null = null;
        const duration = 1500; // 1.5 seconds
        let animationFrameId: number;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            // easeOutQuad interpolation
            const easeProgress = progress * (2 - progress);
            
            setAnimatedLive(Math.floor(easeProgress * liveCount));

            if (progress < 1) {
                animationFrameId = window.requestAnimationFrame(step);
            } else {
                setAnimatedLive(liveCount);
            }
        };

        animationFrameId = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(animationFrameId);
    }, [liveCount]);

    useEffect(() => {
        if (companiesCount === 0) return;
        
        let startTimestamp: number | null = null;
        const duration = 1500; // 1.5 seconds
        let animationFrameId: number;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            
            // easeOutQuad interpolation
            const easeProgress = progress * (2 - progress);
            
            setAnimatedCompanies(Math.floor(easeProgress * companiesCount));

            if (progress < 1) {
                animationFrameId = window.requestAnimationFrame(step);
            } else {
                setAnimatedCompanies(companiesCount);
            }
        };

        animationFrameId = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(animationFrameId);
    }, [companiesCount]);

    useEffect(() => {
        if (visitorsCount === 0) return;

        let startTimestamp: number | null = null;
        const duration = 1500; // 1.5 seconds
        let animationFrameId: number;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);

            // easeOutQuad interpolation
            const easeProgress = progress * (2 - progress);

            setAnimatedVisitors(Math.floor(easeProgress * visitorsCount));

            if (progress < 1) {
                animationFrameId = window.requestAnimationFrame(step);
            } else {
                setAnimatedVisitors(visitorsCount);
            }
        };

        animationFrameId = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(animationFrameId);
    }, [visitorsCount]);

    // Quiet counters (plan 16 §16.4/§16.8): each one is a real number or it does
    // not render at all. The data logic above is untouched.
    const stats: { label: string; value: string }[] = [];
    if (liveCount > 0) {
        stats.push({ label: 'Openings shared', value: animatedLive.toLocaleString() });
    }
    if (companiesCount > 0) {
        stats.push({ label: 'Companies on the board', value: animatedCompanies.toLocaleString() });
    }
    if (visitorsCount > 0) {
        stats.push({ label: 'Freshers here today', value: animatedVisitors.toLocaleString() });
    }

    if (stats.length === 0) return null;

    return (
        <div className="flex flex-wrap items-end justify-center gap-x-8 gap-y-4 border-t border-border/50 pt-6">
            {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center">
                    <span className="font-display text-2xl font-bold tabular-nums tracking-tight text-foreground md:text-3xl">
                        {stat.value}
                    </span>
                    <span className="mt-1 font-record text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {stat.label}
                    </span>
                </div>
            ))}
        </div>
    );
}
