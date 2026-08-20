import { DiscoveryState } from '@fresherflow/pipeline';
import { normalizeUrl } from '@fresherflow/pipeline';
import { PLUGIN_REGISTRY, AtsJob } from '@fresherflow/plugins';
import { parseJobUrl } from '@fresherflow/parser';
import { isLocationIndiaOrRemote, scoreJobDescription } from '@fresherflow/domain';
import { isJobLive } from '@fresherflow/pipeline';
import { BAD_TITLE_REGEXES } from '@fresherflow/pipeline';

export async function verifyCandidates(state: DiscoveryState, isDiscoveryRunning: () => boolean) {
    const VERIFIER_CONCURRENCY = 4;
    console.log(`\n=== Starting Verifier Daemon (${VERIFIER_CONCURRENCY} workers) ===\n`);


    if (!state.browser) {
        throw new Error("Browser is not initialized in DiscoveryState");
    }

    const verifierWorker = async () => {
        const context = await state.browser!.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }
        });
        const page = await context.newPage();

        try {
            while (true) {
                if (state.isTimeUp()) {
                    console.log(`\n[Timeout] ⏱️ Exceeded 80 minutes, gracefully stopping verifier daemon.`);
                    break;
                }
                const candidate = state.candidateQueue.shift();
                
                if (!candidate) {
                    if (isDiscoveryRunning()) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    } else {
                        break; // Discovery is done and queue is empty!
                    }
                }

                console.log(`  [Verifier] Checking: ${candidate.applyLink}`);
                
                // ── Bronze Layer Native API Fetch ─────────────────────────────────
                let nativeData: { rawPayload: any; textForFiltering: string; locationsForFiltering: string[]; company: string } | null = null;
                const parsed = parseJobUrl(candidate.applyLink);
                if (parsed && parsed.adapter) {
                    const adapterKey = parsed.adapter.toLowerCase().replace('company-', '');
                    const adapter = PLUGIN_REGISTRY[parsed.adapter.toLowerCase()] || PLUGIN_REGISTRY[adapterKey];
                    if (adapter && typeof adapter.fetchJobDetails === 'function') {
                        try {
                            const details = await adapter.fetchJobDetails({
                                applyLink: candidate.applyLink,
                                title: candidate.aggregatorTitle || '',
                                company: candidate.company || parsed.company,
                                source: candidate.source,
                                sourceType: candidate.sourceType,
                            } as AtsJob, undefined);
                            
                            if (details) {
                                const fullText = typeof details === 'string' ? details : details.text;
                                const locations = typeof details === 'string' ? [] : (details.locations || []);
                                const title = typeof details === 'string' ? candidate.aggregatorTitle || 'Unknown API Job' : (details.title || candidate.aggregatorTitle || 'Unknown API Job');
                                const companyName = typeof details === 'string' ? candidate.company : (details.company || candidate.company);
                                
                                nativeData = {
                                    rawPayload: { title, html: typeof details === 'string' ? '' : details.html },
                                    textForFiltering: fullText,
                                    locationsForFiltering: locations,
                                    company: companyName || 'Unknown Company'
                                };
                            }
                        } catch (e: any) {
                            console.log(`  -> ⚠️ Plugin API fetch failed for ${candidate.applyLink}: ${e.message}`);
                        }
                    }
                }
                
                if (nativeData) {
                    console.log(`  ⚡ FAST PATH (Native API via Plugin): ${candidate.applyLink}`);
                    const isIndiaRemote = nativeData.locationsForFiltering.length === 0 || 
                                          nativeData.locationsForFiltering.some(l => isLocationIndiaOrRemote(l));
                    
                    if (!isIndiaRemote) {
                        console.log(`  -> ❌ Skipping API job: Foreign location`);
                        state.visited["__discovered_apply_links__"].push(normalizeUrl(candidate.applyLink));
                        continue;
                    }

                    const atsScore = scoreJobDescription(nativeData.rawPayload.title || candidate.aggregatorTitle || 'Unknown', nativeData.textForFiltering);
                    if (atsScore.verdict === 'REJECT') {
                        console.log(`  -> ❌ Skipping API job: Rejected by scorer (Score: ${atsScore.score})`);
                        state.visited["__discovered_apply_links__"].push(normalizeUrl(candidate.applyLink));
                        continue;
                    }

                    const titleToCheck = nativeData.rawPayload.title || candidate.aggregatorTitle || 'Unknown';
                    const isBadTitle = BAD_TITLE_REGEXES.some(regex => regex.test(titleToCheck));
                    if (isBadTitle) {
                        console.log(`  -> ❌ Skipping API job: Bad title (${titleToCheck})`);
                        state.visited["__discovered_apply_links__"].push(normalizeUrl(candidate.applyLink));
                        continue;
                    }

                    console.log(`  ✅ API LIVE: ${candidate.applyLink}`);
                    const normalizedApplyLink = normalizeUrl(candidate.applyLink);
                    state.visited["__discovered_apply_links__"].push(normalizedApplyLink);
                    if (state.visited["__discovered_apply_links__"].length > 50000) state.visited["__discovered_apply_links__"] = state.visited["__discovered_apply_links__"].slice(-50000);

                    // Register newly discovered ATS board from dorker — only if the job is confirmed live
                    const c = candidate as any;
                    if (c.pendingBoardProvider && c.pendingBoardId) {
                        if (!state.atsRegistry[c.pendingBoardProvider]) state.atsRegistry[c.pendingBoardProvider] = {};
                        const providerRegistry = state.atsRegistry[c.pendingBoardProvider]!;
                        if (!providerRegistry[c.pendingBoardId]) {
                            providerRegistry[c.pendingBoardId] = c.pendingBoardName || c.pendingBoardId;
                            state.registryModified = true;
                            console.log(`  🌟 [Dorker→Registry] NEW board confirmed live: ${c.pendingBoardProvider}/${c.pendingBoardId} (${c.pendingBoardName})`);
                        }
                    }

                    state.newJobsFound.push({
                        title: nativeData.rawPayload.title || candidate.aggregatorTitle || 'Unknown API Job',
                        applyLink: candidate.applyLink,
                        source: candidate.source,
                        sourceType: candidate.sourceType,
                        discoveredAt: new Date().toISOString(),
                        reviewRequired: candidate.isAggregatorReview || false,
                        aggregatorUrl: candidate.aggregatorUrl,
                        aggregatorTitle: candidate.aggregatorTitle,
                        company: nativeData.company,
                        rawPayload: nativeData.rawPayload,
                        rawHtml: nativeData.rawPayload.html || nativeData.textForFiltering
                    });
                    continue; // Skip Playwright completely!
                }

                // ── Fallback to Playwright (Non-API) ──────────────────────────────
                let checkResult = await isJobLive(page, candidate.applyLink);
                if (candidate.isTestBypass) {
                    checkResult = { live: true, status: 'live', finalUrl: candidate.applyLink, atsText: checkResult.atsText || '' };
                }

                if (checkResult.live) {
                    let actualApplyLink = checkResult.finalUrl || candidate.applyLink;

                    // Fix SmartRecruiters API URLs — convert internal API URLs to public job page URLs
                    if (actualApplyLink.includes('api.smartrecruiters.com')) {
                        try {
                            const u = new URL(actualApplyLink);
                            const parts = u.pathname.split('/').filter(Boolean);
                            const compIdx = parts.indexOf('companies');
                            const postIdx = parts.indexOf('postings');
                            const slug = compIdx !== -1 ? parts[compIdx + 1] : '';
                            const jobId = postIdx !== -1 ? parts[postIdx + 1] : '';
                            if (slug && jobId) {
                                actualApplyLink = `https://jobs.smartrecruiters.com/${slug}/${jobId}`;
                                console.log(`  -> Fixed SR API URL to public URL: ${actualApplyLink}`);
                            }
                        } catch {}
                    }

                    try {
                        const parsedUrl = new URL(actualApplyLink);
                        const host = parsedUrl.hostname.toLowerCase();
                        const pathname = parsedUrl.pathname.toLowerCase();
                        if (host === 'accounts.google.com' || (host === 'google.com' && pathname.startsWith('/accounts'))) {
                            actualApplyLink = candidate.applyLink;
                        }
                    } catch {}
                    console.log(`  ✅ LIVE: ${actualApplyLink} (${checkResult.status})`);

                    // Register newly discovered ATS board from dorker — only if confirmed live via Playwright
                    const cb = candidate as any;
                    if (cb.pendingBoardProvider && cb.pendingBoardId) {
                        if (!state.atsRegistry[cb.pendingBoardProvider]) state.atsRegistry[cb.pendingBoardProvider] = {};
                        const providerRegistryCb = state.atsRegistry[cb.pendingBoardProvider]!;
                        if (!providerRegistryCb[cb.pendingBoardId]) {
                            providerRegistryCb[cb.pendingBoardId] = cb.pendingBoardName || cb.pendingBoardId;
                            state.registryModified = true;
                            console.log(`  🌟 [Dorker→Registry] NEW board confirmed live: ${cb.pendingBoardProvider}/${cb.pendingBoardId} (${cb.pendingBoardName})`);
                        }
                    }

                    let jobTitle = await page.title().catch(() => "");
                    jobTitle = jobTitle.replace(/( - Workday| - Lever| - Greenhouse| Careers| - Jobs| - Job Detail.*| - Careers Marketplace.*| - Harman.*| - Siemens.*| - \d+ | \| .*)$/i, '').trim();
                    // Clean up trailing dashes from stripping
                    jobTitle = jobTitle.replace(/( -)+$/, '').trim();

                    if (!jobTitle || jobTitle.length < 4 || /^(login|sign in|welcome|job details|job details page|careers|opportunities|skip to content|careers at .+|jobs at .+)$/i.test(jobTitle)) {
                        jobTitle = candidate.aggregatorTitle || "Job Title Unknown";
                    }

                    if (jobTitle.toLowerCase().includes("unknown")) {
                        console.log(`  -> ❌ Skipping job: Unknown Job Title`);
                        const normalizedApplyLink = normalizeUrl(actualApplyLink);
                        state.visited["__discovered_apply_links__"].push(normalizedApplyLink);
                        if (state.visited["__discovered_apply_links__"].length > 50000) state.visited["__discovered_apply_links__"] = state.visited["__discovered_apply_links__"].slice(-50000);
                        state.rejectedReasons[normalizedApplyLink] = `Unknown Job Title`;
                        continue;
                    }

                    const isBadTitle = BAD_TITLE_REGEXES.some(regex => regex.test(jobTitle));
                    if (isBadTitle) {
                        console.log(`  -> ❌ Skipping job: Bad title (${jobTitle})`);
                        const normalizedApplyLink = normalizeUrl(actualApplyLink);
                        state.visited["__discovered_apply_links__"].push(normalizedApplyLink);
                        if (state.visited["__discovered_apply_links__"].length > 50000) state.visited["__discovered_apply_links__"] = state.visited["__discovered_apply_links__"].slice(-50000);
                        state.rejectedReasons[normalizedApplyLink] = `Bad Job Title: ${jobTitle}`;
                        continue;
                    }

                    if (checkResult.atsText) {
                        const atsScore = scoreJobDescription(jobTitle, checkResult.atsText);
                        if (atsScore.verdict === 'REJECT') {
                            console.log(`  -> ❌ Skipping job: Rejected by scorer (Score: ${atsScore.score})`);
                            continue;
                        }
                    }

                    const normalizedApplyLink = normalizeUrl(actualApplyLink);
                    state.visited["__discovered_apply_links__"].push(normalizedApplyLink);
                    if (state.visited["__discovered_apply_links__"].length > 50000) state.visited["__discovered_apply_links__"] = state.visited["__discovered_apply_links__"].slice(-50000);

                    state.newJobsFound.push({
                        title: jobTitle,
                        applyLink: actualApplyLink,
                        source: candidate.source,
                        sourceType: candidate.sourceType,
                        discoveredAt: new Date().toISOString(),
                        reviewRequired: candidate.isAggregatorReview || false,
                        aggregatorUrl: candidate.aggregatorUrl,
                        aggregatorTitle: candidate.aggregatorTitle,
                        atsText: checkResult.atsText || '',
                        company: candidate.company,
                        isTestBypass: candidate.isTestBypass,
                        rawHtml: checkResult.atsText || '' // Fallback raw HTML
                    });
                } else {
                    const normalizedApplyLink = normalizeUrl(candidate.applyLink);
                    if (checkResult.status === 'failed') {
                        console.log(`  -> ATS check failed (network/timeout). Will retry next run.`);
                        state.knownLinks.delete(normalizedApplyLink);
                    } else {
                        console.log(`  -> ATS page is expired/senior. Discarding. Reason: ${checkResult.rejectReason}`);
                        state.visited["__discovered_apply_links__"].push(normalizedApplyLink);
                        if (state.visited["__discovered_apply_links__"].length > 50000) state.visited["__discovered_apply_links__"] = state.visited["__discovered_apply_links__"].slice(-50000);
                        state.rejectedReasons[normalizedApplyLink] = checkResult.rejectReason || 'Unknown reason';
                    }
                }
            }
        } finally {
            await page.close();
            await context.close();
        }
    };
    await Promise.all(Array.from({ length: VERIFIER_CONCURRENCY }, () => verifierWorker()));
    
    const MAX_REJECTED = 50000;
    const keys = Object.keys(state.rejectedReasons);
    if (keys.length > MAX_REJECTED) {
        const keysToDelete = keys.slice(0, keys.length - MAX_REJECTED);
        for (const k of keysToDelete) {
            delete state.rejectedReasons[k];
        }
    }
}
