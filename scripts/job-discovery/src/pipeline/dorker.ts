import { DiscoveryState } from '@fresherflow/pipeline';
import { DORKER_ENABLED, DORKER_PAGES_PER_QUERY, HEAVY_DORK_QUERIES, ATS_HOSTNAMES, executeDorkQuery } from '@fresherflow/pipeline';
import { normalizeUrl, sanitizeAtsUrl } from '@fresherflow/pipeline';
import { extractAtsBoard } from '@fresherflow/pipeline';

async function randomDelay(min = 2500, max = 5000) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, ms));
}

export async function discoverDorkerJobs(state: DiscoveryState) {
    if (!DORKER_ENABLED) {
        console.log(`\n=== Phase 1.5: ATS Dork Discovery (SKIPPED via Config) ===\n`);
        return;
    }

    console.log(`\n=== Phase 1.5: ATS Dork Discovery (${HEAVY_DORK_QUERIES.length} queries x ${DORKER_PAGES_PER_QUERY} pages) ===\n`);

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
    const pendingQueries = HEAVY_DORK_QUERIES.map((q, i) => ({ query: q, index: i }));

    const dorkerWorker = async () => {
        while (pendingQueries.length > 0) {
            if (state.isTimeUp()) {
                console.log(`\n[Timeout] ⏱️ Exceeded 80 minutes, halting dorker queries.`);
                break;
            }
            const item = pendingQueries.shift();
            if (!item) continue;
            const { query, index: qi } = item;
            console.log(`\n[Dorker] [${qi + 1}/${HEAVY_DORK_QUERIES.length}] ${query}`);

            try {
                const rawLinks = await executeDorkQuery({
                    query,
                    pages: DORKER_PAGES_PER_QUERY,
                    delayMs: 2500,
                    playwrightContext: context
                });

                totalSeen += rawLinks.length;
                let pageQueued = 0;

                for (const rawLink of rawLinks) {
                    const cleanUrl = sanitizeAtsUrl(rawLink);
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
                    // Mark as globally-visited NOW so other parallel workers skip it.
                    state.knownLinks.add(normalized);
                    state.visited["__discovered_apply_links__"].push(normalized);
                    if (state.visited["__discovered_apply_links__"].length > 50000) {
                      state.visited["__discovered_apply_links__"] = state.visited["__discovered_apply_links__"].slice(-50000);
                    }

                    // Extract board metadata
                    const boardMatch = extractAtsBoard(cleanUrl);
                    let pendingBoardProvider: string | undefined;
                    let pendingBoardId: string | undefined;
                    let pendingBoardName: string | undefined;

                    if (boardMatch) {
                        const { provider, boardId } = boardMatch;
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
                        pendingBoardProvider,
                        pendingBoardId,
                        pendingBoardName,
                    } as any);

                    pageQueued++;
                    totalQueued++;
                }

                console.log(`  -> Query ${qi + 1}: ${pageQueued} new candidates (${rawLinks.length} raw results)`);
                await randomDelay(1500, 3000);
            } catch (err) {
                console.warn(`  [Dorker] Query failed: ${(err as Error).message}`);
            }
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
