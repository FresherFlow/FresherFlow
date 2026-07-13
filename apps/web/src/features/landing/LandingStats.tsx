'use client';

import { useEffect, useState } from 'react';
import { CDN_URL } from '@/lib/utils/runtimeConfig';

interface LandingStatsProps {
    initialLiveCount: number;
    initialCompaniesCount: number;
}

export function LandingStats({ initialLiveCount, initialCompaniesCount }: LandingStatsProps) {
    const [liveCount, setLiveCount] = useState(initialLiveCount || 207);
    const [companiesCount, setCompaniesCount] = useState(initialCompaniesCount || 166);
    
    const [animatedLive, setAnimatedLive] = useState(0);
    const [animatedCompanies, setAnimatedCompanies] = useState(0);

    useEffect(() => {
        // Capture initial values so the catch fallback doesn't close over state
        const initialLive = liveCount;
        const initialCompanies = companiesCount;

        const isLocal = typeof window !== 'undefined' && 
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        if (isLocal) {
            // Skip live fetch on localhost to prevent CORS/offline console errors in dev
            if (!initialLive || initialLive === 0) setLiveCount(207);
            if (!initialCompanies || initialCompanies === 0) setCompaniesCount(166);
            return;
        }

        // Fetch fresh stats from R2/CDN stats.json (lightweight, ~100 bytes)
        fetch(`${CDN_URL}/stats.json`)
            .then(res => res.json())
            .then((data) => {
                if (data && typeof data.opportunities === 'number') {
                    setLiveCount(data.opportunities);
                }
                if (data && typeof data.companies === 'number') {
                    setCompaniesCount(data.companies);
                }
            })
            .catch((err) => {
                console.error('[LandingStats] Failed to fetch stats.json:', err);
                // Fallback to static numbers if CDN is unreachable
                if (!initialLive || initialLive === 0) setLiveCount(207);
                if (!initialCompanies || initialCompanies === 0) setCompaniesCount(166);
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const stats = [
        { label: 'Active Jobs', value: liveCount > 0 ? animatedLive.toLocaleString() : '- -' },
        { label: 'Companies', value: companiesCount > 0 ? animatedCompanies.toLocaleString() : '- -' },
        { label: 'Fake Listings', value: '0' },
    ];

    return (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-6">
            {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl sm:rounded-2xl border border-border bg-card/65 backdrop-blur p-2.5 sm:p-4.5 shadow-sm text-center flex flex-col justify-center">
                    <div className="text-base sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
                        {stat.value}
                    </div>
                    <div className="text-[8px] sm:text-[10px] uppercase tracking-wide sm:tracking-widest text-muted-foreground font-bold mt-0.5 sm:mt-1 leading-tight text-center">
                        {stat.label}
                    </div>
                </div>
            ))}
        </div>
    );
}
