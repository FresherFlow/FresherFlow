import { Page, BrowserContext } from 'playwright';
import { AGGREGATOR_RULES } from '../config/index.js';

export function unwrapRedirectors(urlStr: string): string {
    try {
        let u = new URL(urlStr);
        if ((u.hostname === 'linkedin.com' || u.hostname.endsWith('.linkedin.com')) && u.pathname.includes('/safety/go/')) {
            const nested = u.searchParams.get('url');
            if (nested) return new URL(nested).href;
        } else if ((u.hostname === 'google.com' || u.hostname.endsWith('.google.com')) && u.pathname.includes('/url')) {
            const nested = u.searchParams.get('q') || u.searchParams.get('url');
            if (nested) return new URL(nested).href;
        }
    } catch {}
    return urlStr;
}

const checkedInvalidLinks = new Set<string>();

const aggregatorDomains = new Set<string>();

export function registerAggregatorDomains(hosts: string[]) {
    for (const h of hosts) {
        const clean = h.replace(/^www\./, '').toLowerCase();
        if (clean) aggregatorDomains.add(clean);
    }
}

function isAggregatorDomain(host: string): boolean {
    for (const domain of aggregatorDomains) {
        if (host === domain || host.endsWith('.' + domain)) return true;
    }
    return false;
}

export function isNoiseDomain(urlStr: string): boolean {
    try {
        const u = new URL(unwrapRedirectors(urlStr));
        const host = u.hostname.replace(/^www\./, '').toLowerCase();
        const skip: string[] = AGGREGATOR_RULES._rules?.blacklistedDomains ?? [];
        if (skip.includes(host)) return true;
        for (const noise of skip) {
            if (host.endsWith('.' + noise)) return true;
        }
    } catch {}
    return false;
}

export function isGovtPortalUrl(urlStr: string): boolean {
    try {
        const u = new URL(unwrapRedirectors(urlStr));
        const host = u.hostname.replace(/^www\./, '').toLowerCase();
        const pathLower = u.pathname.toLowerCase();
        const suffixes: string[] = AGGREGATOR_RULES._rules?.govtDomainSuffixes ?? [];
        for (const suffix of suffixes) {
            if (host === suffix.replace(/^\./, '') || host.endsWith(suffix)) return true;
        }
        const portalHosts: string[] = AGGREGATOR_RULES._rules?.govtPortalHosts ?? [];
        if (portalHosts.includes(host) || host.endsWith('.gov.in') || host.endsWith('.nic.in')) {
            const indicators: string[] = AGGREGATOR_RULES._rules?.govtPathIndicators ?? [];
            if (indicators.some(ind => pathLower.includes(ind))) return true;
        }
    } catch {}
    return false;
}

const listingPathSegments = new Set([
    'jobs', 'job', 'jops', 'jobss',
    'careers', 'career', 'carrers', 'carrer', 'carreers', 'carreer',
    'drives', 'drive', 'off-campus', 'offcampus', 'offcampusdrive',
    'search', 'auth', 'signin', 'signup', 'register', 'registration', 'home', 'welcome',
    'opportunities', 'openings', 'vacancy', 'vacancies', 'find-jobs', 'job-search', 'jobsearch',
    'notifications', 'notification', 'results', 'result', 'apply-online', 'applyonline'
]);

function isGovtDomain(host: string): boolean {
    const suffixes: string[] = AGGREGATOR_RULES._rules?.govtDomainSuffixes ?? [];
    for (const suffix of suffixes) {
        if (host === suffix.replace(/^\./, '') || host.endsWith(suffix)) return true;
    }
    return false;
}

// A URL is a listing/portal page (not a specific job) when the path is root
// or its last segment is a listing word with no job ID after it.
function isListingUrl(u: URL): boolean {
    const path = u.pathname.replace(/\/+$/, '');
    if (!path) return true; // bare domain root — not a specific job
    const segments = path.split('/').filter(Boolean);
    const last = segments[segments.length - 1].toLowerCase();
    if (listingPathSegments.has(last)) {
        // Allow listing-looking paths that carry an explicit job identifier in
        // the query (e.g. work.turing.com/job/home?job_id=32120 is a real job).
        const q = (u.search || '').toLowerCase();
        if (/job[_-]?id|jobcode|jobcodeid|requisition[_-]?id|req[_-]?id|position[_-]?id|jobdriveid/.test(q)) return false;
        return true;
    }
    return false;
}

// True when the URL must never become a job: malformed (no TLD), govt portal,
// generic listing page, or a known aggregator/blocked domain.
export function isRejectedApplyUrl(urlStr: string): boolean {
    try {
        const u = new URL(unwrapRedirectors(urlStr));
        const host = u.hostname.replace(/^www\./, '').toLowerCase();
        if (!u.hostname.includes('.')) return true; // malformed, e.g. "http://job4freshers/"
        if (isGovtDomain(host)) return true;
        if (isListingUrl(u)) return true;
        if (isAggregatorDomain(host)) return true;
        const blocked: string[] = AGGREGATOR_RULES._rules?.blacklistedDomains ?? [];
        for (const domain of blocked) {
            if (host === domain || host.endsWith('.' + domain)) return true;
        }
    } catch {
        return true;
    }
    return false;
}

export function isValidApplyLink(urlStr: string, currentDomain: string): boolean {
    try {
        const unwrapped = unwrapRedirectors(urlStr);
        let u = new URL(unwrapped);

        const targetHost = u.hostname.replace(/^www\./, '').toLowerCase();
        const baseHost = currentDomain.replace(/^www\./, '').toLowerCase();
        
        if (targetHost === baseHost) {
            // Allow redirector paths for sites like freshersnow.com
            const pathLower = u.pathname.toLowerCase();
            if (pathLower.includes('/go/') || pathLower.includes('/out/') || pathLower.includes('/apply') || pathLower.includes('/redirect') || pathLower.includes('/visit') || pathLower.includes('register') || pathLower.includes('submit')) {
                return true; // It's a redirector, allow it immediately
            } else {
                return false;
            }
        }
        if (u.protocol.includes('mailto') || u.protocol.includes('javascript')) return false;
        if (isRejectedApplyUrl(unwrapped)) return false;
        if (targetHost.startsWith('courses.')) return false;
        if (u.pathname.toLowerCase().includes('.pdf')) return false;

        // Allow direct LinkedIn job postings (/jobs/view/...), but reject general profiles/channels
        if (targetHost === 'linkedin.com' || targetHost.endsWith('.linkedin.com')) {
            return u.pathname.includes('/jobs/view/');
        }
        
        return true;
    } catch {
        return false;
    }
}

// Find actual ATS link
export async function findActualApplyLink(
    page: Page,
    context: BrowserContext,
    currentDomain: string,
    maxButtons: number = 999,
    timeoutMs: number = 60_000,
): Promise<string | null> {
    // Hard per-page wall-clock deadline. The inner scanning loops use Playwright
    // element / evaluate round-trips that accept no timeout option and can stay
    // unresolved forever on a wedged page (the 2026-09-08 hang). A timestamp
    // check between loops is not enough — only racing against a timer actually
    // bounds the underlying awaits.
    let timeoutId: NodeJS.Timeout | undefined;
    const deadline: Promise<string | null> = new Promise((resolve) => {
        timeoutId = setTimeout(() => {
            console.log(`⏱️ findActualApplyLink exceeded ${timeoutMs}ms deadline on ${page.url()} — giving up on this page.`);
            resolve(null);
        }, timeoutMs);
    });
    try {
        return await Promise.race([
            extractCandidates(page, context, currentDomain, maxButtons),
            deadline,
        ]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

async function extractCandidates(
    page: Page,
    context: BrowserContext,
    currentDomain: string,
    maxButtons: number,
): Promise<string | null> {
    try {
        // Search for explicit apply/register/click here/submit text across the page
        const applyButtons = await page.locator('a, button', { hasText: /(apply|register|click here|submit|official link|careers link|form)/i }).elementHandles();
        console.log(`🔍 Found ${applyButtons.length} apply button(s) on page.`);
        let checked = 0;
        // Dedup anchors repeated within this page pass (sidebar/footer links
        // appear once per wrap); checkedInvalidLinks dedups across passes.
        const seenInPass = new Set<string>();
        for (const btn of applyButtons) {
            if (checked >= maxButtons) break;
            checked++;
            const href = await btn.getAttribute('href');
            if (href) {
                try {
                    const u = new URL(href, page.url());
                    const currentU = new URL(page.url());
                    if (u.pathname.replace(/\/$/, '') === currentU.pathname.replace(/\/$/, '')) {
                        console.log(`🚫 Skipped self-link (same page): ${u.href}`);
                        continue; // Skip self-links even with different query params or trailing slashes
                    }
                    const unwrappedHref = unwrapRedirectors(u.href);
                    // Skip already-seen invalid URLs BEFORE validation work —
                    // each invalid URL logs once per process.
                    if (seenInPass.has(unwrappedHref)) continue;
                    seenInPass.add(unwrappedHref);
                    if (checkedInvalidLinks.has(unwrappedHref)) continue;
                    if (isValidApplyLink(unwrappedHref, currentDomain)) {
                        console.log(`🔗 Apply link found: ${unwrappedHref}`);
                        return unwrappedHref;
                    } else {
                        checkedInvalidLinks.add(unwrappedHref);
                        console.log(`❌ Invalid apply link — not a real application page (skipping): ${unwrappedHref}`);
                    }
                } catch {
                    // Ignore invalid URLs
                }
            }
        }

        // 2. Fall back to collecting all external links and checking for known ATS hosts
        const links = await page.locator('a').evaluateAll(anchors => 
            anchors.map(a => (a as HTMLAnchorElement).href)
        );
        const uniqueLinks = [...new Set(links.map(unwrapRedirectors))];
        const externalLinks = uniqueLinks.filter(l => isValidApplyLink(l, currentDomain));
        console.log(`🔍 Scanned ${links.length} links; ${externalLinks.length} valid external link(s).`);

        for (const link of externalLinks) {
            try {
                const u = new URL(link);
                const h = u.hostname.toLowerCase();
                const pathLower = u.pathname.toLowerCase();
                const atsHosts = [
                    'myworkdayjobs.com', 'myworkdaysite.com', 'greenhouse.io', 'lever.co', 
                    'taleo.net', 'icims.com', 'smartrecruiters.com', 'eightfold.ai', 
                    'oraclecloud.com', 'infosysapps.com', 'phenompro.com', 'ashbyhq.com', 
                    'jobvite.com', 'workable.com', 'rippling.com', 'forms.gle'
                ];
                let isAts = false;
                for (const ats of atsHosts) {
                    if (h === ats || h.endsWith('.' + ats)) {
                        isAts = true; break;
                    }
                }
                if (isAts || h.includes('workday') || h.includes('taleo') || pathLower.includes('careers') || pathLower.includes('jobs')) {
                    console.log(`🔗 ATS fallback link: ${link}`);
                    return link;
                }
            } catch {}
        }

        // 3. If no explicit apply link with an external href was found, try clicking the first apply button (js actions)
        // Skip buttons that are just hash links (anchor scroll links)
        const clickTargets = [];
        for (const btn of applyButtons) {
            const href = await btn.getAttribute('href');
            if (!href || !href.startsWith('#')) {
                clickTargets.push(btn);
            }
        }

        if (clickTargets.length > 0 && context) {
            const [newPage] = await Promise.all([
                context.waitForEvent('page', { timeout: AGGREGATOR_RULES.preClickTimeout }).catch(() => null),
                clickTargets[0].click({ timeout: AGGREGATOR_RULES.preClickTimeout }).catch(() => null)
            ]);

            if (newPage) {
                try {
                    await newPage.waitForLoadState('load', { timeout: 10000 });
                    const url = newPage.url();
                    if (isValidApplyLink(url, currentDomain)) {
                        return url;
                    }
                } catch (e) {
                    // Timeout or page crash
                } finally {
                    await newPage.close();
                }
            } else {
                await page.waitForTimeout(3000);
                const currentUrl = page.url();
                if (isValidApplyLink(currentUrl, currentDomain)) {
                    return currentUrl;
                }
            }
        }
        
        // 4. Return first external link from content area as a fallback
        return externalLinks.length > 0 ? externalLinks[0] : null;

    } catch (err) {
        console.error("❌ Error finding apply link:", (err as Error).message);
        return null;
    }
}
