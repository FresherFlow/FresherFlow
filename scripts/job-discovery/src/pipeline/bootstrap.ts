import { chromium } from 'playwright';
import { DiscoveryState, createInitialState } from '@fresherflow/pipeline';
import { loadVisited, loadRejectedReasons, loadPostedLinks, fetchTargetSitesFromCdn } from '@fresherflow/pipeline';
import { normalizeUrl, fetchSignedJson } from '@fresherflow/pipeline';

type CdnFeed = { opportunities?: Array<{ applyLink?: string; sourceLink?: string }> };

/**
 * Load the published-jobs CDN feed used to seed the dedupe set.
 *
 * This feed is an optimisation, not a hard requirement. The alternative dedupe
 * sources (R2 visited state + `__discovered_apply_links__`) still work, so an
 * unavailable feed must degrade to an empty set with a loud warning instead of
 * killing the run before discovery has even started.
 */
async function loadBootstrapFeed(): Promise<{ opportunities: CdnFeed['opportunities']; loadedFromCdn: boolean }> {
    const res = await fetchSignedJson<CdnFeed>('/bootstrap-feed.min.json', {
        label: 'bootstrap-feed.min.json',
        attempts: 3,
        validate: (data) => typeof data === 'object' && data !== null,
    });

    if (!res.ok) {
        console.warn(
            `⚠️  CDN bootstrap feed unavailable (${res.reason}). ` +
            `Continuing with an empty known-link set — dedupe falls back to R2 visited state only.`,
        );
        return { opportunities: [], loadedFromCdn: false };
    }

    const opportunities = Array.isArray(res.data?.opportunities) ? res.data.opportunities : [];
    if (opportunities.length === 0) {
        console.warn('⚠️  CDN bootstrap feed contained no opportunities. Continuing with an empty known-link set.');
    }
    return { opportunities, loadedFromCdn: true };
}

export async function bootstrapState(): Promise<DiscoveryState> {
    // Aggregator sites/channels json is only needed when this run does aggregator work
    const mode = (process.env.DISCOVERY_MODE || 'all').toLowerCase();
    if (mode !== 'ats') {
        await fetchTargetSitesFromCdn();
    }
    const state = createInitialState();

    console.log("Fetching CDN feed...");
    const { opportunities: feedOpportunities, loadedFromCdn } = await loadBootstrapFeed();

    for (const opp of feedOpportunities || []) {
        if (opp.applyLink) state.knownLinks.add(normalizeUrl(opp.applyLink));
        if (opp.sourceLink) state.knownLinks.add(normalizeUrl(opp.sourceLink));
    }
    state.stats.known_links_loaded = state.knownLinks.size;
    console.log(
        loadedFromCdn
            ? `Loaded ${state.knownLinks.size} known links from CDN feed.`
            : `Known-link bootstrap skipped (CDN feed unavailable).`,
    );

    state.visited = await loadVisited();
    state.rejectedReasons = await loadRejectedReasons();
    state.postedLinks = await loadPostedLinks();
    if (!state.visited["__discovered_apply_links__"]) {
        state.visited["__discovered_apply_links__"] = [];
    }
    state.stats.visited_links_loaded = state.visited["__discovered_apply_links__"].length;

    state.browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    return state;
}
