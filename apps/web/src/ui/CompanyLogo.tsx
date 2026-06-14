'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils/utils';
import { BRAND_DOMAINS, getRootDomain } from '@fresherflow/utils';
import ShieldCheckIcon from '@heroicons/react/24/solid/ShieldCheckIcon';

// Global in-memory cache for instant resolution
const logoCache = new Map<string, string>();

interface CompanyLogoProps {
    companyName: string;
    companyWebsite?: string | null;
    companyLogoUrl?: string | null;
    applyLink?: string | null;
    className?: string;
    /** Pass true for the first 1-2 above-fold cards to improve LCP */
    priority?: boolean;
    isGovernment?: boolean;
}

export default function CompanyLogo({ companyName, companyWebsite, companyLogoUrl, applyLink, className, priority = false, isGovernment }: CompanyLogoProps) {
    const [attemptIndex, setAttemptIndex] = useState(0);
    const [imgError, setImgError] = useState(false);

    const normalizedName = (companyName || '').toLowerCase().trim();
    const isTcsBrand = normalizedName.includes('tata consultancy services') || normalizedName.includes(' tcs') || normalizedName === 'tcs';

    const isGovDetected = useMemo(() => {
        if (isGovernment) return true;
        const nameClean = normalizedName;
        const hasGovKeyword = nameClean.includes('commission') || nameClean.includes('board') || nameClean.includes('police') || nameClean.includes('railway') || nameClean.includes('air force') || nameClean.includes('navy') || nameClean.includes('army') || nameClean.includes('ministry');
        const hasGovDomain = (companyWebsite && (companyWebsite.includes('.gov.in') || companyWebsite.includes('.nic.in') || companyWebsite.includes('tgprb.in') || companyWebsite.includes('cdac.in'))) ||
                             (applyLink && (applyLink.includes('.gov.in') || applyLink.includes('.nic.in') || applyLink.includes('tgprb.in') || applyLink.includes('cdac.in')));
        return !!(hasGovKeyword || hasGovDomain);
    }, [isGovernment, normalizedName, companyWebsite, applyLink]);

    const candidates = useMemo(() => {
        const urls: string[] = [];

        // 1. Explicit Logo URL (highest priority)
        if (companyLogoUrl) {
            urls.push(companyLogoUrl);
        }

        if (isGovDetected && !companyLogoUrl) {
            // Check for an acronym in parentheses: e.g. "Railway Recruitment Board (RRB)" -> "rrb"
            const match = companyName.match(/\(([^)]+)\)/);
            if (match && match[1]) {
                const acronym = match[1].toLowerCase().trim();
                // Ensure it's just letters
                if (/^[a-z]+$/.test(acronym)) {
                    urls.push(`https://cdn.fresherflow.in/logos/${acronym}.png`);
                }
            } else {
                // If no parenthesis, check if the whole name is just an acronym
                const cleanName = companyName.toLowerCase().trim();
                if (/^[a-z]+$/.test(cleanName) && cleanName.length <= 6) {
                    urls.push(`https://cdn.fresherflow.in/logos/${cleanName}.png`);
                }
            }
            // Do not query third party favicons for government sites
            return urls;
        }

        // 2. Resolve Domain
        const websiteDomain = companyWebsite ? getRootDomain(companyWebsite) : null;
        const applyDomain = applyLink ? getRootDomain(applyLink) : null;

        const cleanName = normalizedName.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const knownDomain = BRAND_DOMAINS[cleanName] ||
            Object.entries(BRAND_DOMAINS).find(([key]) => cleanName.includes(key))?.[1];

        const domainsToTry = Array.from(new Set([
            websiteDomain,
            applyDomain,
            knownDomain,
            // Heuristic fallback: try company-name.com if it's a single word
            !knownDomain && cleanName.length > 2 && cleanName.length < 15 && !cleanName.includes(' ') ? `${cleanName}.com` : null
        ].filter((d): d is string => !!d)));

        // 3. Provider Rotation (Google -> Clearbit -> DuckDuckGo)
        domainsToTry.forEach(d => {
            // Google Favicon (Best overall coverage)
            urls.push(`https://www.google.com/s2/favicons?domain=${d}&sz=128`);
            // Clearbit (High fidelity)
            urls.push(`https://logo.clearbit.com/${d}`);
            // DuckDuckGo (Reliable backup)
            urls.push(`https://icons.duckduckgo.com/ip3/${d}.ico`);
        });

        return Array.from(new Set(urls));
    }, [companyLogoUrl, companyWebsite, applyLink, normalizedName, isGovDetected, companyName]);

    // Use cached URL if available for instant load
    const cacheKey = candidates.join('|');
    const [currentSrc, setCurrentSrc] = useState<string | null>(() => logoCache.get(cacheKey) || candidates[0] || null);

    // Sync state when candidates change (prop change)
    const [prevCacheKey, setPrevCacheKey] = useState(cacheKey);
    if (cacheKey !== prevCacheKey) {
        setPrevCacheKey(cacheKey);
        const cached = logoCache.get(cacheKey);
        if (cached) {
            setCurrentSrc(cached);
        } else {
            setAttemptIndex(0);
            setImgError(false);
            setCurrentSrc(candidates[0] || null);
        }
    }

    const handleError = () => {
        if (attemptIndex < candidates.length - 1) {
            const nextIndex = attemptIndex + 1;
            setAttemptIndex(nextIndex);
            setCurrentSrc(candidates[nextIndex]);
        } else {
            setImgError(true);
        }
    };

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        const target = e.target as HTMLImageElement;
        // Google's S2 favicon service returns a 16px globe for unknown domains
        // even when sz=128 is requested. Treat it as a failure to trigger next provider.
        if (target.naturalWidth <= 16 && target.naturalWidth > 0 && candidates[attemptIndex]?.includes('google.com')) {
            handleError();
        } else {
            // Success! Cache the working URL
            logoCache.set(cacheKey, candidates[attemptIndex]);
        }
    };

    if (!currentSrc || imgError) {
        if (isGovDetected) {
            return (
                <div className={cn("w-16 h-16 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-500", className)}>
                    <ShieldCheckIcon className="w-16 h-16" />
                </div>
            );
        }
        if (isTcsBrand) {
            return (
                <div className={cn("w-12 h-12 bg-[#005a9c] border border-[#005a9c] rounded flex items-center justify-center shrink-0", className)}>
                    <span className="text-white text-[11px] font-bold tracking-wide">TCS</span>
                </div>
            );
        }
        return (
            <div className={cn("w-12 h-12 bg-slate-800 text-slate-200 font-bold text-xl rounded flex items-center justify-center shrink-0", className)}>
                {companyName ? companyName.slice(0, 1).toUpperCase() : 'C'}
            </div>
        );
    }

    return (
        <div className={cn(
            isGovDetected
                ? "relative w-16 h-16 shrink-0 flex items-center justify-center"
                : "relative w-12 h-12 bg-muted/40 dark:bg-transparent border border-border rounded overflow-hidden shrink-0 flex items-center justify-center p-1",
            className
        )}>
            <Image
                src={currentSrc}
                alt={`${companyName} logo`}
                width={isGovDetected ? 64 : 48}
                height={isGovDetected ? 64 : 48}
                className="object-contain w-full h-full"
                onError={handleError}
                onLoad={handleLoad}
                priority={priority}
                loading={priority ? undefined : 'lazy'}
                unoptimized
                referrerPolicy="no-referrer"
            />
        </div>
    );
}
