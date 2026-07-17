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
    rawPayload?: any;
    rawHtml?: string;
}

/** Every number tracked during a single pipeline run */
export interface RunStats {
    // ── Bootstrap ────────────────────────────────────────────────────────────
    known_links_loaded: number;       // links pre-loaded from CDN feed (already in admin)
    visited_links_loaded: number;     // dedup state loaded from R2 at startup

    // ── Per-ATS provider: raw links fetched from each ATS API ────────────────
    ats_raw: Record<string, number>;  // e.g. { greenhouse: 320, lever: 88, workday: 45 }
    ats_passed_filter: Record<string, number>; // after fresher + location filter
    ats_passed_scorer: Record<string, number>; // after NLP scorer

    // ── ATS Phase pipeline ────────────────────────────────────────────────────
    ats_queued: number;               // candidates entering verifier
    ats_skipped_duplicate: number;    // already in visited state
    ats_skipped_location: number;     // foreign location rejected
    ats_verified_live: number;        // confirmed live via Playwright/API
    ats_rejected_scorer: number;      // rejected by NLP during verification
    ats_failed_network: number;       // network timeout / Playwright crash

    // ── Per-aggregator site: links scraped from each site ─────────────────────
    agg_raw: Record<string, number>;       // e.g. { Naukri: 20, YCombinator: 8 }
    agg_passed_scorer: Record<string, number>; // after NLP title score
    agg_rejected_scorer: Record<string, number>; // rejected by scorer per site
    agg_rejected_senior: Record<string, number>; // rejected by isSeniorJob per site

    // ── Aggregator Phase pipeline ─────────────────────────────────────────────
    agg_queued: number;
    agg_skipped_duplicate: number;
    agg_verified_live: number;
    agg_failed_no_link: number;       // could not find apply link on aggregator page

    // ── Final output ─────────────────────────────────────────────────────────
    total_found: number;              // all jobs that made it to newJobsFound
    accepted: number;                 // reviewRequired === false
    review_required: number;          // reviewRequired === true
    new_ats_boards: number;           // auto-discovered new ATS boards this run
    new_career_domains: number;       // new generic career domains found
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
    stats: RunStats;
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
        discoveredRemaining: new Set(),
        stats: {
            known_links_loaded: 0,
            visited_links_loaded: 0,
            ats_raw: {},
            ats_passed_filter: {},
            ats_passed_scorer: {},
            ats_queued: 0,
            ats_skipped_duplicate: 0,
            ats_skipped_location: 0,
            ats_verified_live: 0,
            ats_rejected_scorer: 0,
            ats_failed_network: 0,
            agg_raw: {},
            agg_passed_scorer: {},
            agg_rejected_scorer: {},
            agg_rejected_senior: {},
            agg_queued: 0,
            agg_skipped_duplicate: 0,
            agg_verified_live: 0,
            agg_failed_no_link: 0,
            total_found: 0,
            accepted: 0,
            review_required: 0,
            new_ats_boards: 0,
            new_career_domains: 0,
        }
    };
}
