import { DiscoveryState } from './state.js';
import { normalizeUrl } from '../utils/url.js';
import { tryFetchNativeApi } from '../core/raw-fetcher.js';
import { isLocationIndiaOrRemote } from '../filters/ats-filters.js';
import { scoreJobDescription } from '../filters/scorer.js';
import { isJobLive } from '../core/verifier.js';

export async function verifyCandidates(state: DiscoveryState, phaseName: string) {
    if (state.candidateQueue.length === 0) return;
    
    const VERIFIER_CONCURRENCY = 4;
    console.log(`\n=== Verifying ${phaseName} pages (${VERIFIER_CONCURRENCY} workers) ===\n`);
    
    const pendingCandidates = [...state.candidateQueue];
    state.candidateQueue.length = 0; // Clear queue for next phase

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
            while (pendingCandidates.length > 0) {
                const candidate = pendingCandidates.shift();
                if (!candidate) continue;

                console.log(`  [Verifier] Checking: ${candidate.applyLink}`);
                
                // ── Bronze Layer Native API Fetch ─────────────────────────────────
                const nativeData = await tryFetchNativeApi(candidate.applyLink);
                
                if (nativeData) {
                    console.log(`  ⚡ FAST PATH (Native API): ${candidate.applyLink}`);
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

                    console.log(`  ✅ API LIVE: ${candidate.applyLink}`);
                    const normalizedApplyLink = normalizeUrl(candidate.applyLink);
                    state.visited["__discovered_apply_links__"].push(normalizedApplyLink);
                    if (state.visited["__discovered_apply_links__"].length > 50000) state.visited["__discovered_apply_links__"] = state.visited["__discovered_apply_links__"].slice(-50000);

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
                        rawPayload: nativeData.rawPayload
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
                    try {
                        const parsedUrl = new URL(actualApplyLink);
                        const host = parsedUrl.hostname.toLowerCase();
                        const pathname = parsedUrl.pathname.toLowerCase();
                        if (host === 'accounts.google.com' || (host === 'google.com' && pathname.startsWith('/accounts'))) {
                            actualApplyLink = candidate.applyLink;
                        }
                    } catch {}
                    console.log(`  ✅ LIVE: ${actualApplyLink} (${checkResult.status})`);

                    let jobTitle = await page.title().catch(() => "");
                    jobTitle = jobTitle.replace(/( - Workday| - Lever| - Greenhouse| Careers| - Jobs| \| .*)$/i, '').trim();

                    if (!jobTitle || jobTitle.length < 4 || /^(login|sign in|welcome|job details|careers|opportunities|skip to content|careers at .+|jobs at .+)$/i.test(jobTitle)) {
                        jobTitle = candidate.aggregatorTitle || "Job Title Unknown";
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
