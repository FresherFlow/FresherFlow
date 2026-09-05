import { chromium } from 'playwright';
import { DiscoveryState, createInitialState } from '@fresherflow/pipeline';
import { loadVisited, loadRejectedReasons, loadPostedLinks, fetchTargetSitesFromCdn } from '@fresherflow/pipeline';
import { CDN_SECRET } from '@fresherflow/pipeline';
import { signUrl, normalizeUrl } from '@fresherflow/pipeline';


export async function bootstrapState(): Promise<DiscoveryState> {
    // Aggregator sites/channels json is only needed when this run does aggregator work
    const mode = (process.env.DISCOVERY_MODE || 'all').toLowerCase();
    if (mode !== 'ats') {
        await fetchTargetSitesFromCdn();
    }
    const state = createInitialState();
    
    console.log("Fetching CDN feed...");
    let feed: any = { opportunities: [] };
    if (!CDN_SECRET) {
        console.warn("CDN_SIGNATURE_SECRET is missing. Running without known links bootstrap cache.");
    } else {
        try {
            const url = signUrl('/bootstrap-feed.min.json');
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Feed fetch failed: ${res.statusText}`);
            feed = await res.json();
        } catch (err) {
            console.error("Failed to fetch CDN JSON", err);
            process.exit(1);
        }
    }

    for (const opp of (feed.opportunities || [])) {
        if (opp.applyLink) state.knownLinks.add(normalizeUrl(opp.applyLink));
        if (opp.sourceLink) state.knownLinks.add(normalizeUrl(opp.sourceLink));
    }
    console.log(`Loaded ${state.knownLinks.size} known links from CDN feed.`);

    state.visited = await loadVisited();
    state.rejectedReasons = await loadRejectedReasons();
    state.postedLinks = await loadPostedLinks();
    if (!state.visited["__discovered_apply_links__"]) {
        state.visited["__discovered_apply_links__"] = [];
    }

    state.browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    return state;
}
