import fs from 'fs';
import path from 'path';
import { DiscoveryState } from '@fresherflow/pipeline';
import { ATS_CDN_BASE, ATS_PROVIDERS, TARGET_SITES, fetchTargetSitesFromCdn } from '@fresherflow/pipeline';
import { normalizeUrl, sanitizeAtsUrl } from '@fresherflow/pipeline';
import { isLocationIndiaOrRemote, scoreJobDescription, hasFresherKeyword, isActualJob, isFresherJob, isSeniorJob } from '@fresherflow/utils';
import { logDecision } from '@fresherflow/pipeline';
import { findActualApplyLink } from '@fresherflow/pipeline';
import { extractAtsBoard } from '@fresherflow/pipeline';
import { runAtsDiscovery, runDirectCompanyDiscovery } from '@fresherflow/pipeline';

export async function discoverAtsJobs(state: DiscoveryState) {
    console.log(`\n=== Phase 0: Direct Company & ATS Discovery ===\n`);
    
    // 1. Direct Company Scrapers (Google, Amazon, Microsoft, IBM, Apple, Uber, Stripe, Meta, Nvidia)
    const companyJobs = await runDirectCompanyDiscovery(
        state.knownLinks,
        state.visited["__discovered_apply_links__"]
    );

    // 2. ATS Provider APIs (Greenhouse, Lever, Ashby, etc.)
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

    const atsJobs = await runAtsDiscovery(
        state.atsRegistry,
        state.stats,
        state.knownLinks,
        state.visited["__discovered_apply_links__"]
    );

    const allDiscoveredJobs = [...companyJobs, ...atsJobs];
    let atsQueued = 0, atsRejected = 0;

    let companiesList: any[] = [];
    try {
        const p1 = path.resolve(process.cwd(), 'docs/data/companies.json');
        const p2 = path.resolve(process.cwd(), '../../docs/data/companies.json');
        if (fs.existsSync(p1)) companiesList = JSON.parse(fs.readFileSync(p1, 'utf8'));
        else if (fs.existsSync(p2)) companiesList = JSON.parse(fs.readFileSync(p2, 'utf8'));
    } catch (e) {
        console.error('Failed to load companies.json', e);
    }
    const companySlugMap = new Map(companiesList.map(c => [c.slug, c.name]));

    for (const job of allDiscoveredJobs) {
        if (job.company && companySlugMap.has(job.company.toLowerCase())) {
            job.company = companySlugMap.get(job.company.toLowerCase())!;
        }
        if (state.isTimeUp()) {
            console.log(`\n[Timeout] ⏱️ Exceeded 80 minutes, halting ATS job processing.`);
            break;
        }

        if (!job.title || job.title === 'Unknown Title') {
            console.log(`  [ATS] Skipping — invalid title: ${job.title}`);
            continue;
        }
        if (!job.applyLink || job.applyLink.includes('/undefined')) {
            console.log(`  [ATS] Skipping — invalid link: ${job.applyLink}`);
            continue;
        }
        if (!(job as any).isTestBypass && !isLocationIndiaOrRemote(job.location || '', job.title)) {
            console.log(`  [ATS] Skipping — foreign location "${job.location || 'No Loc'}": ${job.title}`);
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
            const scoreResult = scoreJobDescription(job.title, job.description);
            if (scoreResult.verdict === 'REJECT') continue;
            
            // If it's a MEDIUM score, it requires review UNLESS the title is explicitly a fresher title.
            // If it's ACCEPT, it does NOT require review.
            const needsReview = scoreResult.verdict === 'MEDIUM' && !hasFresherKeyword(job.title);

            state.newJobsFound.push({
                title: job.title,
                applyLink: job.applyLink,
                source: job.source,
                sourceType: 'ATS',
                discoveredAt: new Date().toISOString(),
                reviewRequired: needsReview,
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

    let activeSites = [...TARGET_SITES];
    if (activeSites.length === 0) {
        activeSites = [...await fetchTargetSitesFromCdn()];
    }
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
            if (['image', 'media', 'font'].includes(type)) {
                route.abort();
            } else {
                route.continue();
            }
        });

        while (activeSites.length > 0) {
            if (state.isTimeUp()) {
                console.log(`\n[Timeout] ⏱️ Exceeded 80 minutes, halting aggregator scraping.`);
                break;
            }

            const site = activeSites.shift();
            if (!site) continue;
            
            let page = await context.newPage();
            try {
                console.log(`\n--- Scraping ${site.name} ---`);
                if (!state.visited[site.name]) state.visited[site.name] = [];

                const jobLinks: string[] = [];
                const siteDomain = new URL(site.urls[0]).hostname;

                for (const url of site.urls) {
                    console.log(`  -> Loading start page: ${url}`);
                    try {
                        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
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
                const visitedSet = new Set(state.visited[site.name]);
                const unvisitedLinks = uniqueJobLinks.filter(link => !visitedSet.has(link));
                console.log(`Found ${unvisitedLinks.length} new unvisited links for ${site.name}.`);

                for (const jobLink of unvisitedLinks.slice(0, 20)) {
                    if (state.isTimeUp()) {
                        console.log(`\n[Timeout] ⏱️ Exceeded 80 minutes, halting aggregator post processing.`);
                        break;
                    }

                    console.log(`Checking aggregator post: ${jobLink}`);
                    state.visited[site.name].push(jobLink);
                    
                    if (state.visited[site.name].length > 50000) {
                        state.visited[site.name] = state.visited[site.name].slice(-50000);
                    }
                    // Close and recreate page to avoid stale browser state from previous timeout
                    await page.close().catch(() => {});
                    page = await context.newPage();
                    
                    try {
                        await page.goto(jobLink, { waitUntil: 'domcontentloaded', timeout: 20000 });
                    } catch (gotoErr) {
                        console.log(`  -> Failed to load aggregator post: ${(gotoErr as Error).message}`);
                        continue;
                    }

                    await page.waitForSelector('article, .post-body, .entry-content, main, #main-content, .post, .job-description', { timeout: 10000 }).catch(() => {});
                    await page.waitForTimeout(1000);
                    const aggregatorTitle = await page.locator('h1').first().innerText({ timeout: 500 }).catch(() => "");
                    
                    const scoreResult = scoreJobDescription(aggregatorTitle, "");
                    logDecision(scoreResult, jobLink, 'Aggregator');

                    let isAggregatorReview = true;

                    if (scoreResult.verdict === 'REJECT') {
                        console.log(`  -> Skipping: Rejected by NLP scorer`);
                        continue;
                    }

                    // Apply the strict regex logic that was previously in verify-reviews.ts
                    if (isSeniorJob(aggregatorTitle)) {
                        console.log(`  -> Skipping: Confirmed senior job (Regex pattern found in title)`);
                        continue;
                    }

                    if (isFresherJob(aggregatorTitle)) {
                        console.log(`  -> Title contains strong fresher regex patterns. Skipping review flag.`);
                        isAggregatorReview = false;
                    } else if (scoreResult.verdict === 'MEDIUM') {
                        // Keep review required if we aren't 100% sure
                        isAggregatorReview = true;
                    }

                    if (!isActualJob(aggregatorTitle)) {
                        if (hasFresherKeyword(aggregatorTitle)) {
                            console.log(`  -> Borderline non-job type (Syllabus/PDF). Keeping review flag TRUE.`);
                            isAggregatorReview = true;
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
            } finally {
                await page.close();
            }
        }
        await context.close();
    };

    await Promise.all(Array.from({ length: SCRAPER_CONCURRENCY }, () => scraperWorker()));
    console.log(`\n=== Phase 2 Complete. ${state.candidateQueue.length} candidates queued for verification. ===\n`);
}
