import { Page, BrowserContext } from 'playwright';

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

// Universal junk that never hosts jobs — NOT aggregator sites. Aggregator
// domains (job4freshers.co.in, dailypharmajobs.in, ...) come from the CDN
// aggregators.json via registerAggregatorDomains() — never hardcoded here.
const blacklistedDomains = [
    'facebook.com', 'twitter.com', 'x.com', 'whatsapp.com', 
    'telegram.org', 't.me', 'telegram.me', 'telegram.dog', 'youtube.com', 'youtu.be', 
    'instagram.com', 'foundit.in', 'naukri.com', 'cloudflare.com', 
    'play.google.com', 'plus.google.com', 'accounts.google.com', 'apps.apple.com',
    'pinterest.com', 'reddit.com',
    'openinapp.co', 'openinapp.link', 'linktr.ee', 'bio.link', 'bit.ly', 'tinyurl.com',
    'instamojo.com', 'razorpay.me', 'cosmofeed.com', 'topmate.io', 'gumroad.com',
    'maps.google.com', 'maps.app.goo.gl', 'goo.gl/maps', 'easylatexresume.com',
    'cookieyes.com', 'generatepress.com', 'wordpress.org', 'wordpress.com', 'gravatar.com',
    'elementor.com', 'schema.org', 'doubleclick.net', 'google-analytics.com', 'googletagmanager.com',
    'w.org', 'wp.com', 'blogspot.com', 'getrevue.co', 'revue.co',
    'frontlinesedutech.com', 'courses.frontlinesedutech.com',
    'apprenticeshipindia.org', 'mhrdnats.gov.in', 'nats.education.gov.in', 'udemy.com',
    'coursera.org', 'edx.org', 'simplilearn.com', 'greatlearning.in', 'medium.com',
    'subscribepage.com', 'mailerlite.com', 'getresponse.com', 'activecampaign.com', 'convertkit.com'
];

// Aggregator site domains, populated from CDN aggregators.json at runtime
// (fetchTargetSitesFromCdn). This is the single source of truth — if a site
// is added/removed in the JSON, rejection follows automatically.
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

// Govt exam/recruitment portals — never post or save until govt support is planned
const govtDomainSuffixes = [
    '.gov.in', '.nic.in', '.ibps.in', 'ssc.gov.in', 'upsc.gov.in', 'rrb.gov.in',
    'digialm.com', 'indiapost.gov.in', 'drdo.gov.in', 'isro.gov.in', 'bsf.gov.in'
];

// Listing/portal pages with no specific job (e.g. /jobs, /careers, /drives/off-campus).
// Includes common misspellings seen on Indian job aggregator sites (carrers, jops...)
// so a bare category page can't sneak past the URL gate.
const listingPathSegments = new Set([
    'jobs', 'job', 'jops', 'jobss',
    'careers', 'career', 'carrers', 'carrer', 'carreers', 'carreer',
    'drives', 'drive', 'off-campus', 'offcampus', 'offcampusdrive',
    'search', 'auth', 'signin', 'signup', 'register', 'registration', 'home', 'welcome',
    'opportunities', 'openings', 'vacancy', 'vacancies', 'find-jobs', 'job-search', 'jobsearch',
    'notifications', 'notification', 'results', 'result', 'apply-online', 'applyonline'
]);

function isGovtDomain(host: string): boolean {
    for (const suffix of govtDomainSuffixes) {
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
        for (const domain of blacklistedDomains) {
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
): Promise<string | null> {
    try {
        // Search for explicit apply/register/click here/submit text across the page
        const applyButtons = await page.locator('a, button', { hasText: /(apply|register|click here|submit|official link|careers link|form)/i }).elementHandles();
        console.log(`🔍 Found ${applyButtons.length} apply button(s) on page.`);
        let checked = 0;
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
                    if (isValidApplyLink(unwrappedHref, currentDomain)) {
                        console.log(`🔗 Apply link found: ${unwrappedHref}`);
                        return unwrappedHref;
                    } else {
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
        const externalLinks = links.map(unwrapRedirectors).filter(l => isValidApplyLink(l, currentDomain));
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
                context.waitForEvent('page', { timeout: 5000 }).catch(() => null),
                clickTargets[0].click({ timeout: 5000 }).catch(() => null)
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
