import * as cheerio from 'cheerio';
import { BrowserContext } from 'playwright';

export interface DorkExecutorOptions {
    query: string;
    pages?: number;
    delayMs?: number;
    playwrightContext?: BrowserContext;
}

export async function executeDorkQuery(options: DorkExecutorOptions): Promise<string[]> {
    const pages = options.pages || 1;
    const delay = options.delayMs || 2000;
    const rawLinks = new Set<string>();

    if (options.playwrightContext) {
        const page = await options.playwrightContext.newPage();
        try {
            for (let p = 0; p < pages; p++) {
                const pageOffset = p * 30;
                const searchUrl = pageOffset === 0
                    ? `https://html.duckduckgo.com/html/?q=${encodeURIComponent(options.query)}`
                    : `https://html.duckduckgo.com/html/?q=${encodeURIComponent(options.query)}&s=${pageOffset}`;

                await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
                await new Promise(r => setTimeout(r, delay));

                const urlBadges = await page.$$eval('a.result__url', els => els.map(a => (a as HTMLAnchorElement).href)).catch(() => [] as string[]);
                const snippetHrefs = await page.$$eval('a.result__snippet', els => els.map(a => (a as HTMLAnchorElement).href)).catch(() => [] as string[]);
                
                let found = 0;
                for (const rawLink of [...urlBadges, ...snippetHrefs]) {
                    const unwrapped = unwrapDuckDuckGoUrl(rawLink);
                    if (unwrapped) {
                        rawLinks.add(unwrapped);
                        found++;
                    }
                }
                if (found === 0) break;
            }
        } finally {
            await page.close().catch(() => {});
        }
    } else {
        // Fetch + Cheerio fallback
        for (let p = 0; p < pages; p++) {
            const pageOffset = p * 30;
            const searchUrl = pageOffset === 0
                ? `https://html.duckduckgo.com/html/?q=${encodeURIComponent(options.query)}`
                : `https://html.duckduckgo.com/html/?q=${encodeURIComponent(options.query)}&s=${pageOffset}`;

            try {
                const res = await fetch(searchUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    signal: AbortSignal.timeout(25000)
                });
                const html = await res.text();
                const $ = cheerio.load(html);
                
                let found = 0;
                $('.result__url, .result__snippet').each((_, el) => {
                    const href = $(el).attr('href');
                    if (href) {
                        const unwrapped = unwrapDuckDuckGoUrl(href);
                        if (unwrapped) {
                            rawLinks.add(unwrapped);
                            found++;
                        }
                    }
                });
                if (found === 0) break;
            } catch (err: any) {
                console.warn(`[Dorker] Fetch query failed: ${err.message}`);
                break;
            }
            if (p < pages - 1) await new Promise(r => setTimeout(r, delay));
        }
    }

    return Array.from(rawLinks);
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
