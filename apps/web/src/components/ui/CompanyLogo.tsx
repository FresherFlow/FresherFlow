'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Helper to extract root domain from URL
const getDomainFromUrl = (url: string): string | null => {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
    } catch {
        return null; // Return null if invalid URL
    }
};

const getRootDomain = (domain: string) => {
    const parts = domain.split('.').filter(Boolean);
    if (parts.length <= 2) return domain;
    const tld = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (tld === 'co.in' || tld === 'com.au') {
        return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
};

interface CompanyLogoProps {
    companyName: string;
    companyWebsite?: string | null;
    companyLogoUrl?: string | null;
    applyLink?: string | null;
    className?: string;
    /** Pass true for the first 1-2 above-fold cards to improve LCP */
    priority?: boolean;
}

export default function CompanyLogo({ companyName, companyWebsite, companyLogoUrl, className, priority = false }: CompanyLogoProps) {
    const [imgError, setImgError] = useState(false);
    const normalizedCompanyName = (companyName || '').toLowerCase();
    const isTcsBrand = normalizedCompanyName.includes('tata consultancy services') || normalizedCompanyName.includes(' tcs') || normalizedCompanyName === 'tcs';

    const knownDomains: Record<string, string> = {
        wipro: 'wipro.com',
        infosys: 'infosys.com',
        tcs: 'tcs.com',
        'tata consultancy services': 'tcs.com',
        accenture: 'accenture.com',
        deloitte: 'deloitte.com',
        cognizant: 'cognizant.com',
        capgemini: 'capgemini.com',
        'tech mahindra': 'techmahindra.com',
        hcl: 'hcltech.com',
        'hcl technologies': 'hcltech.com',
        ibm: 'ibm.com',
        oracle: 'oracle.com',
        sap: 'sap.com',
        'amazon': 'amazon.com',
        'google': 'google.com',
        'microsoft': 'microsoft.com',
        'meta': 'meta.com',
        'atlassian': 'atlassian.com'
    };

    const normalizedCompany = companyName
        ? companyName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
        : '';

    const knownDomain = normalizedCompany
        ? knownDomains[normalizedCompany]
        || Object.entries(knownDomains).find(([key]) => normalizedCompany.includes(key))?.[1]
        : undefined;

    const websiteDomain = companyWebsite ? getDomainFromUrl(companyWebsite) : null;
    const normalizedWebsiteDomain = websiteDomain ? getRootDomain(websiteDomain) : null;

    const [attemptIndex, setAttemptIndex] = useState(0);

    const candidates: string[] = [];
    if (companyLogoUrl) {
        candidates.push(`${companyLogoUrl}?size=80`);
    }

    const addLogoProvider = (domain: string) => {
        candidates.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    };

    // Only use high-confidence domains for logo lookup.
    // Constructed/guessed domains (from company name or apply link) are too unreliable
    // and will cause DuckDuckGo to return its generic globe icon instead of a real logo.
    if (normalizedWebsiteDomain) {
        addLogoProvider(normalizedWebsiteDomain);
    }
    if (knownDomain) {
        addLogoProvider(knownDomain);
    }

    const dedupedCandidates = Array.from(new Set(candidates));

    const currentSrc = dedupedCandidates[attemptIndex];

    const handleError = () => {
        if (attemptIndex < dedupedCandidates.length - 1) {
            setAttemptIndex(prev => prev + 1);
        } else {
            setImgError(true);
        }
    };

    if (!currentSrc || imgError) {
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
        <div className={cn("relative w-12 h-12 bg-muted/40 dark:bg-transparent border border-border rounded overflow-hidden shrink-0 flex items-center justify-center p-1", className)}>
            <Image
                src={currentSrc}
                alt={`${companyName} logo`}
                width={48}
                height={48}
                className="object-contain w-full h-full"
                onError={handleError}
                onLoad={(e) => {
                    const target = e.target as HTMLImageElement;
                    // Google's S2 favicon service returns a 16px globe for unknown domains
                    // even when sz=128 is requested. Treat it as a failure.
                    if (target.naturalWidth <= 16 && target.naturalWidth > 0) {
                        handleError();
                    }
                }}
                priority={priority}
                loading={priority ? undefined : 'lazy'}
                unoptimized
            />
        </div>
    );
}
