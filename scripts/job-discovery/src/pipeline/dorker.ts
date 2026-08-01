import { DiscoveryState } from './state.js';
import { DORKER_ENABLED, DORKER_PAGES_PER_QUERY } from '../config.js';
import { normalizeUrl, sanitizeAtsUrl } from '../utils/url.js';
import { extractAtsBoard } from '../core/ats-detector.js';

/**
 * Prioritised fresher/intern dork queries for India.
 * Tier 1 = Internships (highest density of relevant results)
 * Tier 2 = Fresher / New Grad
 * Tier 3 = Graduate Trainee / Apprentice programs
 * Tier 4 = Entry Level / Junior / Associate
 * Tier 5 = SDE-1 / SWE-1 level roles
 * Tier 6 = Campus / Off-campus drives
 * Tier 7 = Early Career broader sweep
 */
const DORK_QUERIES = [
    // ── Tier 1: Internships ───────────────────────────────────────────────────
    'site:boards.greenhouse.io "intern" OR "internship" "India"',
    'site:jobs.lever.co "intern" OR "internship" "India"',
    'site:myworkdayjobs.com "intern" OR "internship" "India"',
    'site:jobs.smartrecruiters.com "intern" OR "internship" "India"',
    'site:jobs.ashbyhq.com "intern" OR "internship" "India"',

    // ── Tier 2: Fresh Graduates / New Grad / Fresher ─────────────────────────
    'site:boards.greenhouse.io ("new grad" OR "fresh graduate" OR "fresher" OR "recent graduate") "India"',
    'site:jobs.lever.co ("new grad" OR "fresh graduate" OR "fresher") "India"',
    'site:myworkdayjobs.com ("new grad" OR "fresh graduate" OR "fresher" OR "recent graduate") "India"',
    'site:jobs.smartrecruiters.com ("fresher" OR "fresh graduate" OR "new grad") "India"',

    // ── Tier 3: Graduate / Trainee / Apprentice programs ─────────────────────
    'site:boards.greenhouse.io ("graduate trainee" OR "graduate engineer" OR "graduate program" OR "apprentice" OR "trainee") "India"',
    'site:jobs.lever.co ("graduate trainee" OR "graduate engineer" OR "apprentice" OR "trainee") "India"',
    'site:myworkdayjobs.com ("graduate trainee" OR "graduate engineer" OR "apprentice" OR "campus hire") "India"',

    // ── Tier 4: Entry Level / Junior / Associate ──────────────────────────────
    'site:boards.greenhouse.io ("entry level" OR "entry-level" OR "junior" OR "associate engineer") "India"',
    'site:jobs.lever.co ("entry level" OR "entry-level" OR "junior" OR "associate") "India"',
    'site:myworkdayjobs.com ("entry level" OR "entry-level" OR "associate" OR "junior") "India"',
    'site:jobs.smartrecruiters.com ("entry level" OR "junior" OR "associate" OR "trainee") "India"',

    // ── Tier 5: SDE-1 / SWE-1 level roles ───────────────────────────────────
    'site:boards.greenhouse.io ("SDE 1" OR "SDE-1" OR "SDE1" OR "software engineer 1" OR "software engineer i") "India"',
    'site:jobs.lever.co ("SDE 1" OR "SDE-1" OR "software engineer i" OR "software engineer 1") "India"',
    'site:myworkdayjobs.com ("SDE 1" OR "SDE-1" OR "software engineer 1" OR "software engineer i") "India"',

    // ── Tier 6: Campus / Off-campus drives ───────────────────────────────────
    'site:boards.greenhouse.io ("campus hire" OR "campus hiring" OR "off campus" OR "off-campus") "India"',
    'site:myworkdayjobs.com ("campus hire" OR "campus hiring" OR "off campus" OR "off-campus drive") "India"',
    'site:jobs.lever.co ("campus" OR "off-campus") "India"',

    // ── Tier 7: Early Career broader sweep ───────────────────────────────────
    'site:boards.greenhouse.io "early career" "India"',
    'site:jobs.lever.co "early career" "India"',
    'site:myworkdayjobs.com "early career" "India"',
];

const ATS_HOSTNAMES = [
    'myworkdayjobs.com',
    'greenhouse.io',
    'lever.co',
    'smartrecruiters.com',
    'ashbyhq.com',
    'oracle.com',
    'oraclecloud.com',
    'workable.com',
    'recruitee.com',
    'icims.com',
];

async function randomDelay(min = 2500, max = 5000) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, ms));
}

export async function discoverDorkerJobs(state: DiscoveryState) {
    if (!DORKER_ENABLED) {
        console.log(`\n=== Phase 1.5: ATS Dork Discovery (SKIPPED via Config) ===\n`);
        return;
    }

    console.log(`\n=== Phase 1.5: ATS Dork Discovery (${DORK_QUERIES.length} queries x ${DORKER_PAGES_PER_QUERY} pages) ===\n`);

    if (!state.browser) {
        console.warn(`[Dorker] Browser not initialized. Skipping.`);
        return;
    }

    const context = await state.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
    });

    // Block resource-heavy assets — we only need HTML
    await context.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });

    let totalQueued = 0;
    let totalSeen = 0;
    let totalDupes = 0;

    const DORKER_CONCURRENCY = 3;
    const pendingQueries = DORK_QUERIES.map((q, i) => ({ query: q, index: i }));

    const dorkerWorker = async () => {
        const page = await context.newPage();
        try {
            while (pendingQueries.length > 0) {
                const item = pendingQueries.shift();
                if (!item) continue;
                const { query, index: qi } = item;
                console.log(`\n[Dorker] [${qi + 1}/${DORK_QUERIES.length}] ${query}`);

                for (let p = 0; p < DORKER_PAGES_PER_QUERY; p++) {
                const pageOffset = p * 30;
                const searchUrl = pageOffset === 0
                    ? `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
                    : `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${pageOffset}`;

                try {
                    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
                    await randomDelay(2500, 5000);

                    const urlBadges = await page.$$eval('a.result__url', els => els.map(a => (a as HTMLAnchorElement).href)).catch(() => [] as string[]);
                    const snippetHrefs = await page.$$eval('a.result__snippet', els => els.map(a => (a as HTMLAnchorElement).href)).catch(() => [] as string[]);
                    const rawLinks = Array.from(new Set([...urlBadges, ...snippetHrefs]));

                    totalSeen += rawLinks.length;
                    let pageQueued = 0;

                    for (const rawLink of rawLinks) {
                        // Unwrap DuckDuckGo redirect (?uddg=...)
                        let actualUrl = rawLink;
                        if (rawLink.includes('uddg=')) {
                            try {
                                actualUrl = decodeURIComponent(new URL(rawLink).searchParams.get('uddg') || rawLink);
                            } catch { /* keep rawLink */ }
                        }

                        const cleanUrl = sanitizeAtsUrl(actualUrl);
                        const normalized = normalizeUrl(cleanUrl);

                        // Validate it points to one of our known ATS domains
                        let isAts = false;
                        try {
                            const hn = new URL(cleanUrl).hostname.toLowerCase();
                            isAts = ATS_HOSTNAMES.some(suffix => hn === suffix || hn.endsWith('.' + suffix));
                        } catch { continue; }

                        if (!isAts) continue;

                        // Dedup
                        if (state.knownLinks.has(normalized) || state.visited["__discovered_apply_links__"].includes(normalized)) {
                            totalDupes++;
                            continue;
                        }

                        // Extract board metadata — but DON'T register it yet.
                        // Board registration happens in the verifier ONLY if the job passes the live check.
                        const boardMatch = extractAtsBoard(cleanUrl);
                        let pendingBoardProvider: string | undefined;
                        let pendingBoardId: string | undefined;
                        let pendingBoardName: string | undefined;

                        if (boardMatch) {
                            const { provider, boardId } = boardMatch;
                            // Only mark pending if it's genuinely new
                            if (!state.atsRegistry[provider as string]?.[boardId]) {
                                pendingBoardProvider = provider as string;
                                pendingBoardId = boardId;
                                try {
                                    pendingBoardName = new URL(cleanUrl).hostname.split('.')[0];
                                    pendingBoardName = pendingBoardName.charAt(0).toUpperCase() + pendingBoardName.slice(1);
                                } catch {
                                    pendingBoardName = boardId;
                                }
                            }
                        }

                        state.knownLinks.add(normalized);
                        state.candidateQueue.push({
                            applyLink: cleanUrl,
                            source: 'Dorker',
                            sourceType: 'ATS',
                            aggregatorUrl: '',
                            aggregatorTitle: 'Dorker Discovered Job',
                            isAggregatorReview: false,
                            // Carry board metadata for post-live-check registration
                            pendingBoardProvider,
                            pendingBoardId,
                            pendingBoardName,
                        } as any);

                        pageQueued++;
                        totalQueued++;
                    }

                    console.log(`  -> Page ${p + 1}: ${pageQueued} new candidates (${rawLinks.length} raw results)`);

                    // Stop paginating if DuckDuckGo returned nothing for this page
                    if (rawLinks.length === 0) break;

                } catch (err) {
                    console.warn(`  [Dorker] Page ${p + 1} failed: ${(err as Error).message}`);
                    break;
                }

                // Polite inter-page delay
                if (p < DORKER_PAGES_PER_QUERY - 1) await randomDelay(1500, 3000);
            }
        }
    } finally {
        await page.close().catch(() => {});
    }
};

try {
    await Promise.all(Array.from({ length: DORKER_CONCURRENCY }, () => dorkerWorker()));
} finally {
    await context.close().catch(() => {});
}

    console.log(`\n=== Phase 1.5 Complete ===`);
    console.log(`  Queued: ${totalQueued}  |  Dupes skipped: ${totalDupes}  |  Raw results seen: ${totalSeen}\n`);
}
