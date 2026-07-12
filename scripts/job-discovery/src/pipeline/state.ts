import { Browser } from 'playwright';
import { AtsRegistry } from '../ats/index.js';

export interface Candidate {
    applyLink: string;
    source: string;
    sourceType: 'ATS' | 'AGGREGATOR';
    aggregatorUrl: string;
    aggregatorTitle: string;
    isAggregatorReview: boolean;
    company?: string;
    isTestBypass?: boolean;
}

export interface DiscoveredJobEntry {
    title: string;
    applyLink: string;
    source: string;
    sourceType: 'ATS' | 'AGGREGATOR';
    discoveredAt: string;
    reviewRequired?: boolean;
    aggregatorUrl?: string;
    aggregatorTitle?: string;
    atsText?: string;
    company?: string;
    isTestBypass?: boolean;
    rawPayload?: any; // The Bronze Data Lake raw JSON
    rawHtml?: string; // The Bronze Data Lake raw HTML fallback
}

export interface DiscoveryState {
    browser: Browser | null;
    knownLinks: Set<string>;
    visited: Record<string, string[]>;
    rejectedReasons: Record<string, string>;
    candidateQueue: Candidate[];
    newJobsFound: DiscoveredJobEntry[];
    atsRegistry: AtsRegistry;
    registryModified: boolean;
    discoveredCareers: Set<string>;
    discoveredRemaining: Set<string>;
}

export function createInitialState(): DiscoveryState {
    return {
        browser: null,
        knownLinks: new Set(),
        visited: { "__discovered_apply_links__": [] },
        rejectedReasons: {},
        candidateQueue: [],
        newJobsFound: [],
        atsRegistry: {},
        registryModified: false,
        discoveredCareers: new Set(),
        discoveredRemaining: new Set()
    };
}
