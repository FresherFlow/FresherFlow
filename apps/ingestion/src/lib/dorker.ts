import * as cheerio from 'cheerio';
import { getQueue, QUEUE_NAMES } from '@fresherflow/queue';

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

async function randomDelay(min = 2500, max = 5000) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, ms));
}

function determineAtsProvider(urlStr: string): string | null {
    try {
        const hn = new URL(urlStr).hostname.toLowerCase();
        if (hn === 'greenhouse.io' || hn.endsWith('.greenhouse.io')) return 'greenhouse';
        if (hn === 'lever.co' || hn.endsWith('.lever.co')) return 'lever';
        if (hn === 'myworkdayjobs.com' || hn.endsWith('.myworkdayjobs.com')) return 'workday';
        if (hn === 'smartrecruiters.com' || hn.endsWith('.smartrecruiters.com')) return 'smartrecruiters';
        if (hn === 'ashbyhq.com' || hn.endsWith('.ashbyhq.com')) return 'ashby';
        if (hn === 'oracle.com' || hn.endsWith('.oracle.com') || hn === 'oraclecloud.com' || hn.endsWith('.oraclecloud.com')) return 'oracle';
        if (hn === 'workable.com' || hn.endsWith('.workable.com')) return 'workable';
        if (hn === 'recruitee.com' || hn.endsWith('.recruitee.com')) return 'recruitee';
        if (hn === 'icims.com' || hn.endsWith('.icims.com')) return 'icims';
    } catch { }
    return null;
}

function extractCompanySlug(urlStr: string, provider: string): string | null {
    try {
        const url = new URL(urlStr);
        const pathParts = url.pathname.split('/').filter(Boolean);
        
        if (provider === 'greenhouse' || provider === 'lever' || provider === 'smartrecruiters' || provider === 'ashby' || provider === 'workable') {
            return pathParts[0] || null;
        }
        if (provider === 'workday') {
            const hostParts = url.hostname.split('.');
            return hostParts[0] !== 'www' ? hostParts[0] : null;
        }
        if (provider === 'icims') {
            const hostParts = url.hostname.split('-');
            return hostParts[0] || null;
        }
    } catch {}
    
    try {
        const hostParts = new URL(urlStr).hostname.split('.');
        return hostParts[0] !== 'www' ? hostParts[0] : null;
    } catch {}
    
    return null;
}

export async function runDorker() {
    console.log(`[Dorker] Starting dorker run...`);
    const queue = getQueue(QUEUE_NAMES.scraper);

    const DORKER_PAGES_PER_QUERY = 2; // Keep it lightweight
    let totalQueued = 0;

    for (let i = 0; i < DORK_QUERIES.length; i++) {
        const query = DORK_QUERIES[i];
        console.log(`[Dorker] Query [${i+1}/${DORK_QUERIES.length}]: ${query}`);

        for (let p = 0; p < DORKER_PAGES_PER_QUERY; p++) {
            const pageOffset = p * 30;
            const searchUrl = pageOffset === 0
                ? `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
                : `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${pageOffset}`;

            try {
                const response = await fetch(searchUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5'
                    }
                });

                const html = await response.text();
                const $ = cheerio.load(html);

                const rawLinks = new Set<string>();
                
                $('a.result__url').each((_, el) => {
                    const href = $(el).attr('href');
                    if (href) rawLinks.add(href);
                });
                $('a.result__snippet').each((_, el) => {
                    const href = $(el).attr('href');
                    if (href) rawLinks.add(href);
                });

                let pageQueued = 0;
                for (const rawLink of rawLinks) {
                    let actualUrl = rawLink;
                    if (rawLink.includes('uddg=')) {
                        try {
                            const params = new URL(rawLink, 'https://html.duckduckgo.com').searchParams;
                            const uddg = params.get('uddg');
                            if (uddg) actualUrl = decodeURIComponent(uddg);
                        } catch { }
                    }

                    const provider = determineAtsProvider(actualUrl);
                    if (!provider) continue;

                    const slug = extractCompanySlug(actualUrl, provider);
                    if (!slug) continue;

                    await queue.add('run-target', {
                        ats: provider,
                        slug: slug,
                        company: slug.charAt(0).toUpperCase() + slug.slice(1)
                    });
                    pageQueued++;
                    totalQueued++;
                }

                console.log(`  -> Page ${p + 1}: ${pageQueued} new targets queued`);
                if (rawLinks.size === 0) break;

            } catch (err) {
                console.warn(`  [Dorker] Page ${p + 1} failed: ${(err as Error).message}`);
                break;
            }

            if (p < DORKER_PAGES_PER_QUERY - 1) await randomDelay(1500, 3000);
        }
    }
    
    console.log(`[Dorker] Run complete. Queued ${totalQueued} total targets.`);
}
