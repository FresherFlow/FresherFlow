// ─── Shared types ─────────────────────────────────────────────────────────────

export interface ParsedLocation {
    raw: string;
    country?: string;       // Full country name e.g. "India"
    countryCode?: string;   // ISO 3166-1 alpha-2 e.g. "IN"
    city?: string;
    region?: string;        // State/province
    remote: boolean;
}

export interface AtsJob {
    id?: string;                   // Stable provider ID for deduplication
    title: string;
    applyLink: string;
    company: string;
    location?: string;             // Flat string for downstream filter (backward compat)
    parsedLocation?: ParsedLocation;
    description?: string;
    descriptionSource: 'API' | 'HTML' | 'NONE';
    postedAt?: string;             // ISO date string
    department?: string;
    employmentType?: string;
    source: string;                // e.g. 'ATS_GREENHOUSE', 'ATS_LEVER'
    sourceType: 'ATS';
    boardToken?: string;
}

export interface AtsAdapter {
    providerName: string;
    fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]>;
    fetchJobDetails?(job: AtsJob): Promise<string | undefined>;
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

export const sleep = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

export async function fetchJson<T>(
    url: string,
    init?: RequestInit,
    label?: string
): Promise<T | null> {
    try {
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ...((init?.headers as Record<string, string>) ?? {})
            },
            ...init
        });
        if (!response.ok) {
            console.warn(`[${label ?? 'ATS'}] HTTP ${response.status} ${response.statusText} for ${url}`);
            return null;
        }
        return await response.json() as T;
    } catch (err) {
        console.error(`[${label ?? 'ATS'}] fetch failed for ${url}:`, (err as Error).message);
        return null;
    }
}

// ─── ISO country code → full name ─────────────────────────────────────────────

export const COUNTRY_CODE_MAP: Record<string, string> = {
    IN: 'India', US: 'United States', GB: 'United Kingdom', SG: 'Singapore',
    DE: 'Germany', AU: 'Australia', CA: 'Canada', FR: 'France', NL: 'Netherlands',
    PL: 'Poland', IE: 'Ireland', JP: 'Japan', CN: 'China', AE: 'UAE',
    MY: 'Malaysia', PH: 'Philippines', VN: 'Vietnam', TH: 'Thailand',
    KR: 'South Korea', TW: 'Taiwan', BR: 'Brazil', MX: 'Mexico',
    ES: 'Spain', IT: 'Italy', SE: 'Sweden', HK: 'Hong Kong',
};
