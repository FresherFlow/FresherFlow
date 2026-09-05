import fs from 'fs';
import path from 'path';
import { DiscoveryState } from '@fresherflow/pipeline';
import { ATS_CDN_BASE, ATS_PROVIDERS, TARGET_SITES, fetchTargetSitesFromCdn } from '@fresherflow/pipeline';
import { normalizeUrl, sanitizeAtsUrl, isValidApplyLink } from '@fresherflow/pipeline';
import { isLocationIndiaOrRemote, scoreJobDescription, hasFresherKeyword, isActualJob, isFresherJob, isSeniorJob } from '@fresherflow/utils';
import { logDecision } from '@fresherflow/pipeline';
import { findActualApplyLink } from '@fresherflow/pipeline';
import { extractAtsBoard } from '@fresherflow/pipeline';
import { runAtsDiscovery, runDirectCompanyDiscovery } from '@fresherflow/pipeline';

export async function discoverAtsJobs(state: DiscoveryState) {
    console.log(`\n=== 🏢 Phase 0: Direct Company & ATS Discovery ===\n`);
    
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
                        console.log(`  -> Loaded ${provider}.json from CDN`);
                    } else if (res.status !== 404) {
                        console.warn(`  -> Failed to fetch ${provider}.json: ${res.statusText}`);
                    }
                } catch (err) {
                    // Fall back to local file
                }
            }));
        }

        // Fallback: check local ats-boards directory for any missing providers
        const localAtsDir = path.resolve(process.cwd(), 'scripts/job-discovery/ats-boards');
        const altLocalAtsDir = path.resolve(process.cwd(), 'ats-boards');
        const targetDir = fs.existsSync(localAtsDir) ? localAtsDir : (fs.existsSync(altLocalAtsDir) ? altLocalAtsDir : null);

        if (targetDir) {
            for (const provider of ATS_PROVIDERS) {
                if (!state.atsRegistry[provider]) {
                    const filePath = path.join(targetDir, `${provider}.json`);
                    if (fs.existsSync(filePath)) {
                        try {
                            state.atsRegistry[provider] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                            console.log(`  -> Loaded ${provider}.json from local ats-boards`);
                        } catch {}
                    }
                }
            }
        }
    } catch (err) {
        console.error("Error fetching ATS registry:", err);
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

        if (!job.title || job.title === 'Unknown Title') {
            console.log(`  🚫 [ATS] Skipped — invalid title: ${job.title}`);
            continue;
        }
        if (!job.applyLink || job.applyLink.includes('/undefined')) {
            console.log(`  🚫 [ATS] Skipped — invalid link: ${job.applyLink}`);
            continue;
        }
        if (!(job as any).isTestBypass && !isLocationIndiaOrRemote(job.location || '', job.title)) {
            console.log(`  🌍 [ATS] Skipped — foreign location "${job.location || 'No Loc'}": ${job.title}`);
            atsRejected++;
            continue;
        }

        const normalizedLink = normalizeUrl(job.applyLink);
        if (!(job as any).isTestBypass && (state.knownLinks.has(normalizedLink) || state.visited["__discovered_apply_links__"].includes(normalizedLink))) {
            console.log(`  ♻️ [ATS] Skipped — already known: ${normalizedLink}`);
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

    console.log(`\n✅ ATS Phase 0: ${atsQueued} queued for verification, ${atsRejected} rejected (foreign location).\n`);
}

export async function discoverAggregatorJobs(state: DiscoveryState) {
    if (process.env.SKIP_AGGREGATORS === 'true') {
        console.log(`\n=== Phase 2: Scraping aggregators (SKIPPED via ENV) ===\n`);
        return;
    }
    const SCRAPER_CONCURRENCY = 4;
    console.log(`\n=== 🌐 Phase 2: Scraping aggregator sites (${SCRAPER_CONCURRENCY} workers) ===\n`);

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
                console.log(`🌐 Scraping site: ${site.name}`);
                if (!state.visited[site.name]) state.visited[site.name] = [];

                // Govt-only sites have empty urls (everything sits in govtUrls) — skip them
                if (!site.urls || site.urls.length === 0) {
                    console.log(`⏭️  Skipped ${site.name}: govt-only (no non-govt URLs configured).`);
                    continue;
                }

                const jobLinks: string[] = [];
                const siteDomain = new URL(site.urls[0]).hostname;

                let allLinksThisSite: { text: string; href: string }[] = [];
                const govtUrls = new Set((site as any).govtUrls || []);
                for (const url of site.urls) {
                    if (govtUrls.has(url)) {
                        console.log(`🏛️  Skipped govt URL: ${url}`);
                        continue;
                    }
                    console.log(`📄 Loading start page: ${url}`);
                    try {
                        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
                        const allLinks = await page.$$eval('a', anchors => anchors.map(a => ({ text: a.innerText.trim(), href: a.href })));
                        allLinksThisSite.push(...allLinks);
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
                                        (u.pathname.includes('job') || u.pathname.includes('hiring') || u.pathname.includes('recruitment') || u.pathname.includes('career') || u.pathname.includes('vacancy') || u.pathname.includes('opportunity') || u.pathname.includes('fresher') || u.pathname.includes('walk') || u.pathname.includes('drive') || u.pathname.includes('intern'));
                                } catch {
                                    return false;
                                }
                            })
                            .map(l => l.href);
                        jobLinks.push(...filtered);
                    } catch (gotoErr) {
                        console.error(`❌ Failed to load start page: ${url} —`, (gotoErr as Error).message);
                    }
                }

                // Follow pagination: check for ?page=N links on start pages
                const startUrls = new Set(site.urls.map(u => u.split('?')[0]));
                const paginationLinks = allLinksThisSite
                    .filter(l => /\?page=\d+/.test(l.href) && !startUrls.has(l.href.split('?')[0]))
                    .map(l => l.href)
                    .slice(0, 5); // max 5 extra pages per start URL
                for (const pageUrl of paginationLinks) {
                    try {
                        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                        const pageLinks = await page.$$eval('a', anchors => anchors.map(a => ({ text: a.innerText.trim(), href: a.href })));
                        const pageFiltered = pageLinks
                            .filter(l => {
                                try {
                                    const u = new URL(l.href);
                                    if (u.pathname === '/' || u.pathname.includes('/category/') || u.pathname.includes('/tag/') || u.pathname.includes('/page/') || u.pathname.includes('/author/') || u.pathname.includes('/search/')) return false;
                                    return u.hostname.includes(siteDomain) &&
                                        (u.pathname.includes('job') || u.pathname.includes('hiring') || u.pathname.includes('recruitment') || u.pathname.includes('career') || u.pathname.includes('vacancy') || u.pathname.includes('opportunity') || u.pathname.includes('fresher') || u.pathname.includes('walk') || u.pathname.includes('drive') || u.pathname.includes('intern'));
                                } catch { return false; }
                            })
                            .map(l => l.href);
                        jobLinks.push(...pageFiltered);
                    } catch {}
                }

                // Deduplicate and exclude already-visited links — NORMALIZE before comparison
                // so that /career/, /career/#respond, /career?utm=x all count as the same page.
                const seenNormalized = new Set(
                    state.visited[site.name].map((l: string) => normalizeUrl(l)),
                );
                const uniqueJobLinks: string[] = [];
                const seen: Set<string> = new Set();
                for (const link of jobLinks) {
                    const norm = normalizeUrl(link);
                    if (!seen.has(norm) && !seenNormalized.has(norm)) {
                        seen.add(norm);
                        uniqueJobLinks.push(link);
                    }
                }
                console.log(`🆕 Found ${uniqueJobLinks.length} new link(s) on ${site.name}.`);

                for (const jobLink of uniqueJobLinks.slice(0, 50)) {
                    if (state.isTimeUp()) {
                        console.log(`\n[Timeout] ⏱️ Exceeded 80 minutes, halting aggregator post processing.`);
                        break;
                    }

                    const jobLinkNorm = normalizeUrl(jobLink);
                    // Add to GLOBAL visited IMMEDIATELY so other parallel workers (channel,
                    // dorker, verifier) skip this link even though we're still processing it.
                    state.knownLinks.add(jobLinkNorm);
                    state.visited["__discovered_apply_links__"].push(jobLinkNorm);
                    if (state.visited["__discovered_apply_links__"].length > 50000) {
                        state.visited["__discovered_apply_links__"] = state.visited["__discovered_apply_links__"].slice(-50000);
                    }
                    // Re-check against global knownLinks (channel+site dedup):
                    if (state.knownLinks.has(jobLinkNorm) ||
                        state.visited["__discovered_apply_links__"].includes(jobLinkNorm)) {
                        console.log(`♻️ Skipped: already visited from another source`);
                        continue;
                    }
                    state.visited[site.name].push(jobLinkNorm);
                    console.log(`🔍 Checking post: ${jobLink}`);
                    
                    if (state.visited[site.name].length > 50000) {
                        state.visited[site.name] = state.visited[site.name].slice(-50000);
                    }
                    // Close and recreate page to avoid stale browser state from previous timeout
                    await page.close().catch(() => {});
                    page = await context.newPage();
                    
                    // Fast reject: if the jobLink itself is a listing/aggregator/govt URL — don't load it.
                    // (isValidApplyLink checks this WITHOUT opening the page.)


                    try {
                        await page.goto(jobLink, { waitUntil: 'domcontentloaded', timeout: 20000 });
                    } catch (gotoErr) {
                        console.log(`❌ Failed to load post: ${(gotoErr as Error).message}`);
                        continue;
                    }

                    // Tighten selector wait — 6s max, JS-heavy pages just wait for body.
                    await page.waitForSelector('article, .post-body, .entry-content, main, .post, .job-description, h1', { timeout: 6000 }).catch(() => {});
                    await page.waitForTimeout(500);
                    const aggregatorTitle = await page.locator('h1').first().innerText({ timeout: 500 }).catch(() => "");
                    
                    const scoreResult = scoreJobDescription(aggregatorTitle, "", { skipDriveBlocker: true });
                    logDecision(scoreResult, jobLink, 'Aggregator');

                    let isAggregatorReview = true;

                    // Phase-1 wrapper-title check: only skip on REAL negative evidence
                    // (score < 0 = senior/experienced signals). Score 0 / unknown titles
                    // like "TCS Mass Hiring 2026" pass through flagged for review — the
                    // fresher decision happens on the actual apply page in the verifier,
                    // where real description text exists. Never kill on drive words here.
                    if (scoreResult.verdict === 'REJECT' && scoreResult.score < 0) {
                        console.log(`❌ Skipped: not fresher (score ${scoreResult.score})`);
                        continue;
                    }

                    if (isSeniorJob(aggregatorTitle)) {
                        console.log(`👨‍💼 Skipped: senior/experienced role`);
                        continue;
                    }

                    // Quick secondary gate before full page work: if title is clearly NOT a job,
                    // skip BEFORE extracting apply links.
                    if (!isActualJob(aggregatorTitle, { allowDriveTitles: true }) && !hasFresherKeyword(aggregatorTitle)) {
                        console.log(`🚫 Skipped: not a job post`);
                        continue;
                    }

                    if (isFresherJob(aggregatorTitle)) {
                        console.log(`🎓 Clear fresher title — no review needed.`);
                        isAggregatorReview = false;
                    } else if (scoreResult.verdict === 'MEDIUM') {
                        // Keep review required if we aren't 100% sure
                        isAggregatorReview = true;
                    }

                    if (!isActualJob(aggregatorTitle, { allowDriveTitles: true })) {
                        if (hasFresherKeyword(aggregatorTitle)) {
                            console.log(`⚠️ Borderline non-job (syllabus/PDF) — flagged for review.`);
                            isAggregatorReview = true;
                        } else {
                            console.log(`🚫 Skipped: not a job post.`);
                            continue;
                        }
                    }

                    // Cap apply-link extraction: most Indian job pages have 1-3 real buttons.
                    // Pages with 5+ dead buttons (794 in this run) waste time checking each.
                    // Pass a button cap so the extractor stops after finding max N candidates.
                    const applyLink = await findActualApplyLink(page, context, siteDomain);
                    if (!applyLink) {
                        console.log(`❌ No apply link found on this page.`);
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
                        console.log(`♻️ Skipped: apply link already known`);
                        continue;
                    }

                    state.knownLinks.add(normalizedApplyLink);

                    console.log(`📥 Queued for verification: ${cleanApplyLink}`);
                    state.candidateQueue.push({
                        applyLink: cleanApplyLink,
                        source: site.name,
                        sourceType: 'AGGREGATOR',
                        aggregatorUrl: jobLink,
                        aggregatorTitle: aggregatorTitle.trim(),
                        isAggregatorReview
                    });
                    state.knownLinks.add(normalizeUrl(cleanApplyLink));
                    state.visited["__discovered_apply_links__"].push(normalizeUrl(cleanApplyLink));
                    if (state.visited["__discovered_apply_links__"].length > 50000) {
                        state.visited["__discovered_apply_links__"] = state.visited["__discovered_apply_links__"].slice(-50000);
                    }
                }
            } finally {
                try { await page.close(); } catch {}
            try { await context.close(); } catch {}
            }
        }
        await context.close();
    };

    await Promise.all(Array.from({ length: SCRAPER_CONCURRENCY }, () => scraperWorker()));
    console.log(`\n=== ✅ Phase 2 complete — ${state.candidateQueue.length} candidates queued for verification. ===\n`);
}