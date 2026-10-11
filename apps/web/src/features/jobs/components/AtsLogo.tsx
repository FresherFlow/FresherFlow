'use client';

import { useState } from 'react';
import { cn } from '@/ui/cn';
import { detectAtsProvider } from '@/features/jobs/utils/atsProvider';

interface AtsLogoProps {
    /** Job apply URL — the provider is derived from its hostname. */
    applyLink?: string | null;
    className?: string;
}

/**
 * The ATS provider's real logo mark (e.g. the Greenhouse "G") on job cards.
 * Served through the same Google favicon endpoint `CompanyLogo` already
 * uses — no new assets, no new vendor. Renders nothing when the apply link
 * isn't on a known ATS host or the mark fails to load.
 */
export function AtsLogo({ applyLink, className }: AtsLogoProps) {
    const [failed, setFailed] = useState(false);
    const provider = detectAtsProvider(applyLink);
    if (!provider || failed) return null;
    return (
        // eslint-disable-next-line @next/next/no-img-element -- favicon service URL, must skip the optimizer like CompanyLogo
        <img
            src={`https://www.google.com/s2/favicons?domain=${provider.logoDomain}&sz=128`}
            alt={`${provider.name} logo`}
            title={`Posted via ${provider.name}`}
            width={18}
            height={18}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={cn('size-4.5 shrink-0 rounded-sm object-contain', className)}
        />
    );
}
