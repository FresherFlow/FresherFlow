/**
 * ATS (applicant tracking system) provider detection for job cards.
 *
 * The feed DTO carries no ATS field — the discovery pipeline owns that in
 * its own database — so cards derive the provider from the `applyLink`
 * hostname. The host map mirrors the pipeline's own detection
 * (`packages/parser/src/url-parser.ts`, `packages/pipeline` extractor):
 * a job whose apply link lives on `boards.greenhouse.io` is a Greenhouse
 * posting regardless of which company it belongs to.
 *
 * Pure helper: no network, no storage, safe to call during render.
 */

export interface AtsProviderInfo {
    id: string;
    /** Display name, e.g. "Greenhouse". */
    name: string;
    /** Hostname suffixes that identify this provider (lowercase, no port). */
    hosts: string[];
    /** Root brand domain whose favicon is the provider's logo mark. */
    logoDomain: string;
}

export const ATS_PROVIDERS: AtsProviderInfo[] = [
    { id: 'greenhouse', name: 'Greenhouse', hosts: ['greenhouse.io'], logoDomain: 'greenhouse.io' },
    { id: 'lever', name: 'Lever', hosts: ['lever.co'], logoDomain: 'lever.co' },
    { id: 'workday', name: 'Workday', hosts: ['myworkdayjobs.com', 'myworkdaysite.com'], logoDomain: 'workday.com' },
    { id: 'ashby', name: 'Ashby', hosts: ['ashbyhq.com'], logoDomain: 'ashbyhq.com' },
    { id: 'workable', name: 'Workable', hosts: ['workable.com'], logoDomain: 'workable.com' },
    { id: 'bamboohr', name: 'BambooHR', hosts: ['bamboohr.com'], logoDomain: 'bamboohr.com' },
    { id: 'jobvite', name: 'Jobvite', hosts: ['jobvite.com'], logoDomain: 'jobvite.com' },
    { id: 'icims', name: 'iCIMS', hosts: ['icims.com'], logoDomain: 'icims.com' },
    { id: 'taleo', name: 'Taleo', hosts: ['taleo.net'], logoDomain: 'taleo.net' },
    { id: 'successfactors', name: 'SuccessFactors', hosts: ['successfactors.com'], logoDomain: 'successfactors.com' },
    { id: 'smartrecruiters', name: 'SmartRecruiters', hosts: ['smartrecruiters.com'], logoDomain: 'smartrecruiters.com' },
    { id: 'oracle', name: 'Oracle HCM', hosts: ['oraclecloud.com'], logoDomain: 'oracle.com' },
    { id: 'zoho', name: 'Zoho Recruit', hosts: ['zohorecruit.com', 'recruit.zoho.com'], logoDomain: 'zoho.com' },
    { id: 'freshteam', name: 'Freshteam', hosts: ['freshteam.com'], logoDomain: 'freshteam.com' },
    { id: 'keka', name: 'Keka', hosts: ['keka.com'], logoDomain: 'keka.com' },
    { id: 'darwinbox', name: 'Darwinbox', hosts: ['darwinbox.com', 'darwinbox.in'], logoDomain: 'darwinbox.com' },
    { id: 'eightfold', name: 'Eightfold', hosts: ['eightfold.ai'], logoDomain: 'eightfold.ai' },
    { id: 'phenom', name: 'Phenom', hosts: ['phenompeople.com', 'phenom.com'], logoDomain: 'phenom.com' },
    { id: 'recruitee', name: 'Recruitee', hosts: ['recruitee.com'], logoDomain: 'recruitee.com' },
];

/**
 * Identify the ATS provider from an apply URL. Returns `null` for company
 * career pages, aggregators, short links, and anything unparseable — the
 * badge simply doesn't render there.
 */
export function detectAtsProvider(applyLink?: string | null): AtsProviderInfo | null {
    if (!applyLink || typeof applyLink !== 'string') return null;
    // Bound the untrusted input before it reaches the URL parser.
    if (applyLink.length > 2000) return null;
    let host: string;
    try {
        const url = new URL(applyLink);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        host = url.hostname.toLowerCase();
    } catch {
        return null;
    }
    if (!host) return null;
    for (const provider of ATS_PROVIDERS) {
        for (const suffix of provider.hosts) {
            if (host === suffix || host.endsWith(`.${suffix}`)) {
                return provider;
            }
        }
    }
    return null;
}

/**
 * Apply-button destination for a job detail page: ATS postings name the
 * platform ("Apply on Greenhouse"), government jobs name the portal, and
 * everything else keeps the generic company-site label.
 */
export function getApplyDestination(
    applyLink?: string | null,
    isGovernment?: boolean
): { label: string; provider: AtsProviderInfo | null } {
    const provider = detectAtsProvider(applyLink);
    if (provider) return { label: `Apply on ${provider.name}`, provider };
    if (isGovernment) return { label: 'Apply on official portal', provider: null };
    return { label: 'Apply on company site', provider: null };
}
