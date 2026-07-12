import { DiscoveryState } from './state.js';
import { ATS_CDN_BASE, ATS_PROVIDERS, TARGET_SITES } from '../config.js';
import { normalizeUrl, sanitizeAtsUrl } from '../utils/url.js';
import { isLocationIndiaOrRemote } from '../filters/ats-filters.js';
import { scoreJobDescription } from '../filters/scorer.js';
import { hasFresherKeyword, isActualJob } from '../filters/text-filters.js';
import { logDecision } from '../utils/logger.js';
import { findActualApplyLink } from '../core/extractor.js';
import { extractAtsBoard } from '../core/ats-detector.js';
import { runAtsDiscovery } from '../ats/index.js';

export async function discoverAtsJobs(state: DiscoveryState) {
    console.log(`\n=== Phase 0: Scraping ATS APIs ===\n`);
    
    try {
        if (ATS_CDN_BASE) {
            console.log(`Fetching ATS Boards from CDN (${ATS_CDN_BASE})...`);
            await Promise.all(ATS_PROVIDERS.map(async provider => {
                try {
                    const res = await fetch(`${ATS_CDN_BASE}/${provider}.json`);
                    if (res.ok) {
                        state.atsRegistry[provider] = await res.json();
                        console.log(`  -> Loaded ${provider}.json`);
                    } else if (res.status !== 404) {
                        console.warn(`  -> Failed to fetch ${provider}.json: ${res.statusText}`);
                    }
                } catch (err) {
                    console.warn(`  -> Error fetching ${provider}.json: ${(err as Error).message}`);
                }
            }));
        } else {
            console.log(`ATS_CDN_BASE not set, skipping CDN fetch.`);
        }
    } catch (err) {
        console.error("Critical error fetching ATS registry from CDN:", err);
    }

    const atsJobs = await runAtsDiscovery(state.atsRegistry);

    let atsQueued = 0, atsRejected = 0;
    for (const job of atsJobs) {
        if (!job.title || job.title === 'Unknown Title') {
            console.log(`  [ATS] Skipping — invalid title: ${job.title}`);
            continue;
        }
        if (!job.applyLink || job.applyLink.includes('/undefined')) {
            console.log(`  [ATS] Skipping — invalid link: ${job.applyLink}`);
            continue;
        }
        if (!(job as any).isTestBypass && job.location && !isLocationIndiaOrRemote(job.location)) {
            console.log(`  [ATS] Skipping — foreign location "${job.location}": ${job.title}`);
            atsRejected++;
            continue;
        }

        const normalizedLink = normalizeUrl(job.applyLink);
        if (!(job as any).isTestBypass && (state.knownLinks.has(normalizedLink) || state.visited["__discovered_apply_links__"].includes(normalizedLink))) {
            console.log(`  [ATS] Skipping — already known: ${normalizedLink}`);
            continue;
        }

        state.knownLinks.add(normalizedLink);

        if (job.description && job.descriptionSource === 'API') {
            state.newJobsFound.push({
                title: job.title,
                applyLink: job.applyLink,
                source: job.source,
                sourceType: 'ATS',
                discoveredAt: new Date().toISOString(),
                reviewRequired: false,
                atsText: job.description,
                company: job.company
            });
            state.visited["__discovered_apply_links__"].push(normalizedLink);
            atsQueued++;
            continue;
        }

        state.candidateQueue.push({
            applyLink: job.applyLink,
            source: job.source,
            sourceType: 'ATS',
            aggregatorUrl: '',
            aggregatorTitle: job.title,
            isAggregatorReview: false,
            company: job.company,
            isTestBypass: (job as any).isTestBypass
        });
        atsQueued++;
    }

    console.log(`\n-> ATS Phase 0: ${atsQueued} queued for verification, ${atsRejected} rejected (foreign location).\n`);
}

export async function discoverAggregatorJobs(state: DiscoveryState) {
    if (process.env.SKIP_AGGREGATORS === 'true') {
        console.log(`\n=== Phase 2: Scraping aggregators (SKIPPED via ENV) ===\n`);
        return;
    }
    const SCRAPER_CONCURRENCY = 4;
    console.log(`\n=== Phase 2: Scraping aggregators (${SCRAPER_CONCURRENCY} workers) ===\n`);

    const activeSites = TARGET_SITES;
    if (activeSites.length === 0) {
        console.warn(`Failed to fetch aggregators.json from CDN. Skipping aggregators.`);
        return;
    }

    if (!state.browser) {
        throw new Error("Browser is not initialized in DiscoveryState");
    }

    const scraperWorker = async () => {
        const context = await state.browser!.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        await context.route('**/*', (route) => {
            const type = route.request().resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                route.abort();
            } else {
                route.continue();
            }
        });

        const page = await context.newPage();
        try {
            while (activeSites.length > 0) {
                const site = activeSites.shift();
                if (!site) continue;
                console.log(`\n--- Scraping ${site.name} ---`);
                if (!state.visited[site.name]) state.visited[site.name] = [];

                const jobLinks: string[] = [];
                const siteDomain = new URL(site.urls[0]).hostname;

                for (const url of site.urls) {
                    console.log(`  -> Loading start page: ${url}`);
                    try {
                        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                        const allLinks = await page.$$eval('a', anchors => anchors.map(a => ({ text: a.innerText.trim(), href: a.href })));
                        const filtered = allLinks
                            .filter(l => {
                                try {
                                    const u = new URL(l.href);
                                    if (
                                        u.pathname === '/' ||
                                        u.pathname === '/jobs/' ||
                                        u.pathname === '/freshers/' ||
                                        u.pathname.includes('/category/') ||
                                        u.pathname.includes('/tag/') ||
                                        u.pathname.includes('/page/') ||
                                        u.pathname.includes('/author/') ||
                                        u.pathname.includes('/search/') ||
                                        u.pathname.includes('/whatsapp-group/') ||
                                        u.pathname.includes('/recruitment/') ||
                                        u.pathname.includes('/jobs-by-location/') ||
                                        u.pathname.includes('/jobs-by-batch-year/') ||
                                        u.pathname.includes('/jobs-by-batch/') ||
                                        u.pathname.includes('/off-campus-drive-jobs/') ||
                                        u.pathname.includes('/work-from-home/') ||
                                        u.pathname.includes('/internship/') ||
                                        u.pathname.includes('-batch-jobs') ||
                                        u.pathname.endsWith('-jobs/') ||
                                        u.pathname.endsWith('-jobs')
                                    ) return false;
                                    return u.hostname.includes(siteDomain) &&
                                        (u.pathname.includes('job') || u.pathname.includes('hiring') || u.pathname.includes('recruitment') || u.pathname.includes('career') || u.pathname.includes('vacancy') || u.pathname.includes('opportunity') || u.pathname.includes('fresher'));
                                } catch {
                                    return false;
                                }
                            })
                            .map(l => l.href);
                        jobLinks.push(...filtered);
                    } catch (gotoErr) {
                        console.error(`  -> Failed to load start page ${url}:`, (gotoErr as Error).message);
                    }
                }

                const uniqueJobLinks = [...new Set(jobLinks)];
                const unvisitedLinks = uniqueJobLinks.filter(link => !state.visited[site.name].includes(link));
                console.log(`Found ${unvisitedLinks.length} new unvisited links for ${site.name}.`);

                for (const jobLink of unvisitedLinks.slice(0, 20)) {
                    console.log(`Checking aggregator post: ${jobLink}`);
                    state.visited[site.name].push(jobLink);
                    
                    if (state.visited[site.name].length > 2000) {
                        state.visited[site.name] = state.visited[site.name].slice(-2000);
                    }

                    await page.goto(jobLink, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
                    await page.waitForTimeout(2000);
                    const aggregatorTitle = await page.locator('h1').first().innerText({ timeout: 500 }).catch(() => "");
                    
                    const scoreResult = scoreJobDescription(aggregatorTitle, "");
                    logDecision(scoreResult, jobLink, 'Aggregator');

                    let isAggregatorReview = false;

                    if (scoreResult.verdict === 'REJECT') {
                        console.log(`  -> Skipping: Rejected by scorer (Score: ${scoreResult.score})`);
                        continue;
                    } else if (scoreResult.verdict === 'UNKNOWN' || scoreResult.verdict === 'MEDIUM') {
                        console.log(`  -> ${scoreResult.verdict} job. Skipping review flag.`);
                        isAggregatorReview = false;
                    }

                    if (!isActualJob(aggregatorTitle)) {
                        if (hasFresherKeyword(aggregatorTitle)) {
                            console.log(`  -> Borderline job type. Skipping review flag.`);
                            isAggregatorReview = false;
                        } else {
                            console.log(`  -> Skipping: Not an actual job post.`);
                            continue;
                        }
                    }

                    const applyLink = await findActualApplyLink(page, context, siteDomain);
                    if (!applyLink) {
                        console.log(`  -> Failed to extract apply link.`);
                        continue;
                    }

                    const boardMatch = extractAtsBoard(applyLink);
                    if (boardMatch) {
                        const { provider, boardId } = boardMatch;
                        if (!state.atsRegistry[provider]) state.atsRegistry[provider] = {};
                        if (!state.atsRegistry[provider]![boardId]) {
                            let guessedName = boardId;
                            const atMatch = aggregatorTitle.match(/ at (.+)$/i) || aggregatorTitle.match(/ by (.+)$/i);
                            if (atMatch) {
                                guessedName = atMatch[1].trim();
                            } else if (boardId.startsWith('http')) {
                                try {
                                    guessedName = new URL(boardId).hostname.split('.')[0];
                                    guessedName = guessedName.charAt(0).toUpperCase() + guessedName.slice(1);
                                } catch {
                                    // Ignore invalid URLs
                                }
                            }
                            
                            state.atsRegistry[provider]![boardId] = guessedName;
                            state.registryModified = true;
                            console.log(`  🌟 Discovered NEW ATS board automatically! ${provider}: ${boardId} (${guessedName})`);
                        }
                    } else {
                        try {
                            const urlObj = new URL(applyLink);
                            const baseDomain = urlObj.origin;
                            const lowerUrl = applyLink.toLowerCase();
                            if (/career|job|workday|opportunit/i.test(lowerUrl)) {
                                state.discoveredCareers.add(baseDomain);
                            } else {
                                state.discoveredRemaining.add(baseDomain);
                            }
                        } catch (e) {
                            // Ignore invalid URLs
                        }
                    }

                    const cleanApplyLink = sanitizeAtsUrl(applyLink);
                    const normalizedApplyLink = normalizeUrl(cleanApplyLink);

                    if (state.knownLinks.has(normalizedApplyLink) || state.visited["__discovered_apply_links__"].includes(normalizedApplyLink)) {
                        console.log(`  -> Skipping: Already seen/discovered.`);
                        continue;
                    }

                    state.knownLinks.add(normalizedApplyLink);

                    console.log(`  -> Queued for ATS verification: ${cleanApplyLink}`);
                    state.candidateQueue.push({
                        applyLink: cleanApplyLink,
                        source: site.name,
                        sourceType: 'AGGREGATOR',
                        aggregatorUrl: jobLink,
                        aggregatorTitle: aggregatorTitle.trim(),
                        isAggregatorReview
                    });
                }
            }
        } finally {
            await page.close();
            await context.close();
        }
    };

    await Promise.all(Array.from({ length: SCRAPER_CONCURRENCY }, () => scraperWorker()));
    console.log(`\n=== Phase 2 Complete. ${state.candidateQueue.length} candidates queued for verification. ===\n`);
}
