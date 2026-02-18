'use client';

import { useState } from 'react';
import Image from 'next/image';
import BuildingOfficeIcon from '@heroicons/react/24/outline/BuildingOfficeIcon';
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
    companyWebsite?: string;
    applyLink?: string;
    className?: string;
}

export default function CompanyLogo({ companyName, companyWebsite, applyLink, className }: CompanyLogoProps) {
    const [imgError, setImgError] = useState(false);
    const normalizedCompanyName = (companyName || '').toLowerCase();
    const isTcsBrand = normalizedCompanyName.includes('tata consultancy services') || normalizedCompanyName.includes(' tcs') || normalizedCompanyName === 'tcs';

    // candidate domains strategy
    // 1. Domain from applyLink (high confidence)
    // 2. Constructed domain from company name (heuristic)

    // Heuristic: "Tech Mahindra" -> "techmahindra.com"
    const normalizeCompanyName = (name: string) => {
        const suffixes = [
            'ltd', 'limited', 'inc', 'llc', 'pvt', 'private', 'corp', 'corporation',
            'co', 'company', 'group', 'international', 'technologies', 'technology',
            'systems', 'solutions', 'software', 'labs', 'services', 'digital'
        ];
        const tokens = name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(Boolean);

        while (tokens.length > 1 && suffixes.includes(tokens[tokens.length - 1])) {
            tokens.pop();
        }

        return tokens.join('');
    };

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

    const constructedDomain = companyName
        ? `${normalizeCompanyName(companyName)}.com`
        : null;

    const websiteDomain = companyWebsite ? getDomainFromUrl(companyWebsite) : null;
    const linkDomain = applyLink ? getDomainFromUrl(applyLink) : null;
    const normalizedLinkDomain = linkDomain ? getRootDomain(linkDomain) : null;
    const normalizedWebsiteDomain = websiteDomain ? getRootDomain(websiteDomain) : null;
    const blockedDomains = new Set([
        'boards.greenhouse.io',
        'greenhouse.io',
        'jobs.lever.co',
        'lever.co',
        'myworkdayjobs.com',
        'workday.com',
        'careers.microsoft.com',
        'careers.google.com',
        'linkedin.com',
        'naukri.com',
        'indeed.com',
        'monster.com',
        'wellfound.com',
        'angel.co'
    ]);

    const isBlockedDomain = normalizedLinkDomain ? blockedDomains.has(normalizedLinkDomain) : false;
    const linkDomainFallback =
        linkDomain && linkDomain.includes('.myworkdayjobs.com')
            ? `${linkDomain.split('.')[0]}.com`
            : null;

    // Prioritize link domain, fallback to constructed
    // Note: If linkDomain is something generic like "boards.greenhouse.io", this might fail to get the company logo.
    // Ideally we'd filter out generic job boards, but that's a larger task.
    // For now, let's try linkDomain first, then fallback to constructed.

    // However, we can't easily "try" one URL then another in a single render pass without state.
    // Let's rely on linkDomain if valid, otherwise constructed.
    // If linkDomain fails to load (onError), we could fallback to constructed, but that requires 2-step state.

    // Let's implement a simple 2-stage loading mechanism
    // Stage 0: Try linkDomain
    // Stage 1: Try constructedDomain
    // Stage 2: Fallback to Icon

    const [attemptIndex, setAttemptIndex] = useState(0);

    const candidates: string[] = [];
    const addLogoProviders = (domain: string) => {
        candidates.push(`https://logo.clearbit.com/${domain}?size=80`);
        candidates.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
        candidates.push(`https://www.google.com/s2/favicons?sz=128&domain_url=${domain}`);
    };

    if (normalizedWebsiteDomain) {
        addLogoProviders(normalizedWebsiteDomain);
    }
    if (knownDomain) {
        addLogoProviders(knownDomain);
    }
    if (normalizedLinkDomain && !isBlockedDomain) {
        addLogoProviders(normalizedLinkDomain);
    }
    if (linkDomainFallback) {
        addLogoProviders(linkDomainFallback);
    }
    if (constructedDomain) {
        addLogoProviders(constructedDomain);
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
            <div className={cn("w-12 h-12 bg-muted border border-border rounded flex items-center justify-center shrink-0", className)}>
                <BuildingOfficeIcon className="w-6 h-6 text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className={cn("relative w-12 h-12 bg-white border border-border rounded overflow-hidden shrink-0 flex items-center justify-center p-1", className)}>
            <Image
                src={currentSrc}
                alt={`${companyName} logo`}
                width={48}
                height={48}
                className="object-contain w-full h-full"
                onError={handleError}
                unoptimized // Clearbit logos are external and small, optimization is optional but good practice
            />
        </div>
    );
}
