import { chromium } from 'playwright';
import { DiscoveryState, createInitialState } from './state.js';
import { loadVisited, loadRejectedReasons } from '../utils/storage.js';
import { CDN_SECRET } from '../config.js';
import { signUrl, normalizeUrl } from '../utils/url.js';

export async function bootstrapState(): Promise<DiscoveryState> {
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
    if (!state.visited["__discovered_apply_links__"]) {
        state.visited["__discovered_apply_links__"] = [];
    }

    state.browser = await chromium.launch({ headless: true });

    return state;
}
