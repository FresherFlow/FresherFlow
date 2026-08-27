import * as cheerio from 'cheerio';
import { BrowserContext } from 'playwright';

/**
 * Supported search backends for dork queries.
 *
 * `bing` is the default primary engine: it serves organic results over a plain
 * HTML GET with no JavaScript (no Playwright), which works from datacenter /
 * CI (GitHub Actions) IPs. DuckDuckGo's `html.duckduckgo.com` endpoint returns
 * an empty/anomaly page to many cloud IPs, which is why discovery historically
 * collected ~0 URLs even though queries succeeded.
 *
 * Order is configurable via the `DORK_ENGINE` env var (comma-separated list).
 */
export type SearchEngine = 'bing' | 'duckduckgo';

export interface DorkExecutorOptions {
    query: string;
    pages?: number;
    delayMs?: number;
    playwrightContext?: BrowserContext;
    engines?: SearchEngine[];
}

const DEFAULT_ENGINES: SearchEngine[] = ['bing', 'duckduckgo'];

function resolveEngines(opt?: DorkExecutorOptions): SearchEngine[] {
    const fromEnv = (process.env.DORK_ENGINE || '')
        .split(',')
        .map((e) => e.trim().toLowerCase() as SearchEngine)
        .filter((e): e is SearchEngine => e === 'bing' || e === 'duckduckgo');
    if (fromEnv.length > 0) return fromEnv;
    if (opt?.engines && opt.engines.length > 0) return opt.engines;
    return DEFAULT_ENGINES;
}

const SETTINGS: Record<SearchEngine, { label: string; userAgent: string; perPage: number }> = {
    bing: {
        label: 'Bing',
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        perPage: 30,
    },
    duckduckgo: {
        label: 'DuckDuckGo',
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        perPage: 30,
    },
};

/**
 * Executes a search-engine dork query and returns the unique result URLs.
 *
 * Engines are tried in order (default: Bing then DuckDuckGo). An engine is
 * considered a failure for a given page when it yields no parseable organic
 * result links, at which point the next engine in the list is attempted.
 *
 * Note: a `playwrightContext` is only used for the DuckDuckGo path, which is
 * kept for backward compatibility with the job-discovery dorker. Bing works
 * with plain `fetch` + Cheerio and is the recommended engine.
 */
export async function executeDorkQuery(options: DorkExecutorOptions): Promise<string[]> {
    const pages = options.pages || 1;
    const delay = options.delayMs || 2000;
    const engines = resolveEngines(options);

    const collected = new Set<string>();

    for (const engine of engines) {
        let engineFound = 0;

        if (engine === 'duckduckgo' && options.playwrightContext) {
            const page = await options.playwrightContext.newPage();
            try {
                for (let p = 0; p < pages; p++) {
                    const links = await ddgPlaywrightPage(page, options.query, p);
                    for (const link of links) collected.add(link);
                    if (links.length > 0) engineFound += links.length;
                    else break;
                    if (p < pages - 1) await new Promise((r) => setTimeout(r, delay));
                }
            } finally {
                await page.close().catch(() => {});
            }
        } else {
            for (let p = 0; p < pages; p++) {
                let links: string[] = [];
                if (engine === 'bing') {
                    links = await bingFetchPage(options.query, p);
                } else {
                    links = await ddgFetchPage(options.query, p);
                }
                for (const link of links) collected.add(link);
                if (links.length > 0) engineFound += links.length;
                else break;
                if (p < pages - 1) await new Promise((r) => setTimeout(r, delay));
            }
        }

        console.log(`[Dorker] ${SETTINGS[engine].label} yielded ${engineFound} result URLs for "${options.query}"`);
        // Stop once an engine actually yields results — no need to hit slower fallbacks.
        if (engineFound > 0) break;
    }

    return Array.from(collected);
}

async function ddgPlaywrightPage(
    page: import('playwright').Page,
    query: string,
    pageIndex: number
): Promise<string[]> {
    const pageOffset = pageIndex * 30;
    const searchUrl =
        pageOffset === 0
            ? `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
            : `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${pageOffset}`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise((r) => setTimeout(r, 1500));

    const urlBadges = await page
        .$$eval('a.result__url', (els) => els.map((a) => (a as HTMLAnchorElement).href))
        .catch(() => [] as string[]);
    const snippetHrefs = await page
        .$$eval('a.result__snippet', (els) => els.map((a) => (a as HTMLAnchorElement).href))
        .catch(() => [] as string[]);

    const out: string[] = [];
    for (const rawLink of [...urlBadges, ...snippetHrefs]) {
        const unwrapped = unwrapDuckDuckGoUrl(rawLink);
        if (unwrapped && isJobRelevantUrl(unwrapped)) out.push(unwrapped);
    }
    return out;
}

async function ddgFetchPage(query: string, pageIndex: number): Promise<string[]> {
    const pageOffset = pageIndex * 30;
    const searchUrl =
        pageOffset === 0
            ? `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
            : `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${pageOffset}`;

    let res: Response;
    try {
        res = await fetch(searchUrl, {
            headers: { 'User-Agent': SETTINGS.duckduckgo.userAgent },
            signal: AbortSignal.timeout(25000),
        });
    } catch (err: any) {
        console.warn(`[Dorker] DuckDuckGo fetch failed: ${err.message}`);
        return [];
    }

    const html = await res.text();
    if (html.length < 500) return []; // empty / anomaly shell

    const $ = cheerio.load(html);
    const out: string[] = [];
    $('.result__url, .result__snippet').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
            const unwrapped = unwrapDuckDuckGoUrl(href);
            if (unwrapped && isJobRelevantUrl(unwrapped)) out.push(unwrapped);
        }
    });
    return out;
}

async function bingFetchPage(query: string, pageIndex: number): Promise<string[]> {
    const perPage = SETTINGS.bing.perPage;
    const first = pageIndex * perPage + 1;
    const params = new URLSearchParams({ q: query, count: String(perPage), first: String(first) });
    const searchUrl = `https://www.bing.com/search?${params.toString()}`;

    let res: Response;
    try {
        res = await fetch(searchUrl, {
            headers: {
                'User-Agent': SETTINGS.bing.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(25000),
        });
    } catch (err: any) {
        console.warn(`[Dorker] Bing fetch failed: ${err.message}`);
        return [];
    }

    const html = await res.text();
    if (html.length < 500) return []; // empty / anomaly shell

    const $ = cheerio.load(html);
    const out: string[] = [];

    $('li.b_algo h2 a').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const decoded = unwrapBingUrl(href);
        if (decoded && isJobRelevantUrl(decoded)) out.push(decoded);
    });

    return out;
}

/**
 * Broadly-known non-recruitment domains that a general web search can surface
 * (Wikipedia, download/education/career-advice sites). Dropping these keeps the
 * candidate set job-signal oriented without reliance on a strict ATS hostname
 * allowlist, so genuine recruiting pages still flow through to the downstream
 * ATS/aggregator filters.
 */
const NON_JOB_HOSTS = new Set([
    'wikipedia.org', 'en.wikipedia.org', 'simple.wikipedia.org', 'en.m.wikipedia.org',
    'microsoft.com', 'en.softonic.com', 'softonic.com', 'filehippo.com',
    'geeksforgeeks.org', 'britannica.com', 'coursera.org', 'tutorialspoint.com',
    'computerscience.org', 'indeed.com', 'www.indeed.com', 'in.indeed.com',
    'linkedin.com', 'www.linkedin.com', 'in.linkedin.com',
]);

function isJobRelevantUrl(url: string): boolean {
    let host: string;
    try {
        host = new URL(url).hostname.toLowerCase();
    } catch {
        return false;
    }
    if (!host) return false;

    // Drop well-known non-recruitment domains (including generic "job listing"
    // aggregator homepages that add no discoverable posting signal).
    for (const junk of NON_JOB_HOSTS) {
        if (host === junk || host.endsWith('.' + junk)) return false;
    }

    return true;
}

function unwrapDuckDuckGoUrl(rawLink: string): string | null {
    let actualUrl = rawLink;
    if (rawLink.includes('uddg=')) {
        try {
            actualUrl = decodeURIComponent(new URL(rawLink, 'https://html.duckduckgo.com').searchParams.get('uddg') || rawLink);
        } catch { /* ignore */ }
    }
    if (actualUrl.startsWith('http')) return actualUrl;
    return null;
}

/**
 * Bing wraps organic results in `https://www.bing.com/ck/a?...` redirect links.
 * The real destination is carried in the `u` query param as base64. Letting the
 * redirect resolve would add latency and risk, so decode the param directly.
 *
 * The base64 payload sometimes carries a leading `a1` marker; strip any leading
 * non-base64 junk and decode.
 */
function unwrapBingUrl(rawLink: string): string | null {
    let href = rawLink.trim();
    if (href.startsWith('http://')) href = 'https://' + href.slice('http://'.length);

    let target: string | null = null;
    try {
        const url = new URL(href);
        if (url.hostname === 'www.bing.com' || url.hostname === 'bing.com') {
            const encoded = url.searchParams.get('u');
            if (encoded) {
                // Strip a leading `a1` marker if present, then base64-decode.
                const b64 = encoded.replace(/^a1/, '');
                target = safeB64Decode(b64);
            }
        } else {
            target = href;
        }
    } catch {
        target = href;
    }

    if (target && /^https?:\/\//.test(target)) return target;
    return null;
}

function safeB64Decode(b64: string): string | null {
    const cleaned = b64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = cleaned.padEnd(Math.ceil(cleaned.length / 4) * 4, '=');
    try {
        // Browser-fetch compatible decode without atob (Node 18+ has Buffer; scripts run in Node).
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(padded, 'base64').toString('utf8');
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (globalThis as any).atob(padded);
    } catch {
        return null;
    }
}
