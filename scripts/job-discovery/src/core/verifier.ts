import { Page } from 'playwright';
import { EXPIRED_PHRASES, EXPERIENCED_PHRASES } from '../config.js';
import { isActualJob } from '../filters/text-filters.js';
import { scoreJobDescription } from '../filters/scorer.js';
import { logDecision } from '../utils/logger.js';

export interface JobCheckResult {
    live: boolean;
    status: 'live' | 'expired' | 'review' | 'failed';
    atsText?: string; // ATS page body captured at discovery time (used by processor — no re-fetch needed)
    finalUrl?: string;
    rejectReason?: string;
}

// Check if job is live (using existing sweeper logic)
export async function isJobLive(page: Page, url: string): Promise<JobCheckResult> {
    try {
        let response = null;
        let loadFailed = false;
        try {
            response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (gotoErr) {
            console.log(`  -> Navigation warning: ${(gotoErr as Error).message}. Checking DOM anyway.`);
            const errMsg = (gotoErr as Error).message.toLowerCase();
            if (errMsg.includes('net::err_name_not_resolved') || 
                errMsg.includes('net::err_connection_refused') || 
                errMsg.includes('net::err_address_unreachable') ||
                errMsg.includes('net::err_connection_aborted') ||
                errMsg.includes('net::err_connection_reset')
            ) {
                console.log(`  -> Hard network/DNS error: ${errMsg}. Marking as failed.`);
                return { live: false, status: 'failed', atsText: '', rejectReason: `Network error: ${errMsg}` };
            }
            loadFailed = true;
        }

        if (response && (response.status() === 404 || response.status() === 410 || response.status() === 403 || response.status() === 401)) {
            console.log(`  -> Page returned inactive status code: ${response.status()}`);
            return { live: false, status: 'expired', atsText: '', rejectReason: `HTTP status code ${response.status()}` };
        }

        let isReview = false;

        const finalUrl = page.url();
        const finalUrlLower = finalUrl.toLowerCase();
        if (finalUrlLower.includes('not_found') || finalUrlLower.includes('jobnotfound') || finalUrlLower.includes('job-not-found') || finalUrlLower.includes('/jobnotfound') || finalUrlLower.includes('/job-not-found')) {
            console.log(`  -> URL indicates job not found / redirect to portal: ${finalUrl}. Marking as expired.`);
            return { live: false, status: 'expired', atsText: '', rejectReason: `URL pattern indicates job not found (${finalUrl})` };
        }

        const pageTitle = await page.title().catch(() => "");
        const lowerTitle = pageTitle.toLowerCase().trim();
        if (lowerTitle.includes('403') || lowerTitle.includes('forbidden') || lowerTitle.includes('access denied') || lowerTitle.includes('checking your browser') || lowerTitle.includes('attention required')) {
            console.log(`  -> Access blocked (Forbidden/Cloudflare/403 page title: "${pageTitle}").`);
            return { live: false, status: 'expired', atsText: '', rejectReason: `Blocked page title: "${pageTitle}"` };
        }
        // Generic ATS/careers portal titles — not a specific job page
        const isGenericTitle = (
            /^(careers|career search|careersearch|search careers|careers search|job search|jobsearch|opportunities|job opportunities|career opportunities|open positions|current openings|search jobs|search for jobs|login|sign in|welcome|jobs|job|search|career site|job board)$/i.test(lowerTitle) ||
            /^careers at /i.test(lowerTitle) ||
            /^jobs at /i.test(lowerTitle) ||
            /^career site$/i.test(lowerTitle)
        );
        if (isGenericTitle) {
            console.log(`  -> Page title is generic careers portal ("${pageTitle}"). Marking as expired.`);
            return { live: false, status: 'expired', atsText: '', rejectReason: `Generic portal title: "${pageTitle}"` };
        }
        
        // Smart Wait: Wait for actual job content — 800 chars minimum so nav menus
        // (which load first and are typically 100-600 chars on modern portals like Volvo/SAP)
        // don't fire the snapshot early before the real job status/body content renders via JavaScript.
        await page.waitForFunction(() => {
            return document.body && document.body.innerText.trim().length > 800;
        }, { timeout: 10000 }).catch(() => {});
        const bodyText = await page.locator('body').innerText({ timeout: 500 }).catch(() => "");
        if (!bodyText || bodyText.trim().length < 100) {
            if (loadFailed) {
                console.log(`  -> Navigation failed and page body is empty/too short. Marking as failed.`);
                return { live: false, status: 'failed', atsText: '', rejectReason: `Navigation failed and short body` };
            }
            console.log(`  -> Page body is empty or too short (${bodyText?.trim().length || 0} chars). Treating as live.`);
            return { live: true, status: 'live', atsText: '', finalUrl };
        }

        const lowerText = bodyText.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ');

        for (const phrase of EXPIRED_PHRASES) {
            if (lowerText.includes(phrase)) {
                return { live: false, status: 'expired', atsText: '', rejectReason: `Found expired phrase: "${phrase}"` };
            }
        }

        const scoreResult = scoreJobDescription(pageTitle || '', bodyText);
        
        logDecision(scoreResult, finalUrl, 'ATS Verifier');

        if (scoreResult.verdict === 'REJECT') {
            const mainRule = scoreResult.metadata.blockingRule || scoreResult.evidence.blockers[0]?.rule || scoreResult.evidence.negative[0]?.rule || 'SCORE_TOO_LOW';
            console.log(`  -> ATS page rejected by scorer (Score: ${scoreResult.score}). Marking as expired.`);
            return { live: false, status: 'expired', atsText: '', rejectReason: `Scorer rejected (Score: ${scoreResult.score}, Reason: ${mainRule})` };
        } else if (scoreResult.verdict === 'UNKNOWN') {
            console.log(`  -> ATS page returned UNKNOWN confidence by scorer. Treating as live.`);
            isReview = false;
        } else if (scoreResult.verdict === 'MEDIUM') {
            console.log(`  -> ATS page returned MEDIUM confidence (${scoreResult.score}). Treating as live.`);
            isReview = false;
        }

        // Capture ATS text (first 8000 chars) for use by job processor — no re-fetch needed
        const atsText = bodyText.trim().substring(0, 8000);
        return { live: true, status: 'live', atsText, finalUrl };
    } catch (err) {
        console.error("  -> Error checking if job is live:", (err as Error).message);
        return { live: false, status: 'failed', atsText: '', rejectReason: `Unexpected error: ${(err as Error).message}` };
    }
}
