const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_CHILD_SITEMAPS = 8;
// Sitemaps with ~1000 URLs run ~100-300KB. Refuse absurd payloads before regex.
const MAX_SITEMAP_BYTES = 5_000_000;

export type SitemapPostUrl = { url: string; lastmod: string | null };

export type SitemapFetchStats = { childrenFetched: number; earlyStopped: boolean };

export type SitemapFetchResult = { posts: SitemapPostUrl[]; stats: SitemapFetchStats };

function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    if (!isHttpUrl(url)) return null;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': DESKTOP_UA, Accept: 'text/plain, application/xml, text/xml, */*' },
        signal: ctrl.signal,
      });
      if (!res.ok) return null;
      const text = await res.text();
      if (!text || text.length > MAX_SITEMAP_BYTES) return null;
      return text;
    } finally {
      clearTimeout(t);
    }
  } catch {
    return null;
  }
}

function parseRobotsSitemaps(robotsText: string): string[] {
  if (robotsText.length > 1_000_000) return [];
  const out: string[] = [];
  for (const line of robotsText.split('\n')) {
    const m = line.match(/^\s*sitemap\s*:\s*(\S+)/i);
    if (m && m[1] && isHttpUrl(m[1])) out.push(m[1].trim());
  }
  return out;
}

function extractTag(block: string, tag: 'loc' | 'lastmod'): string | null {
  const m = block.match(
    tag === 'loc' ? /<loc>\s*([^<]+?)\s*<\/loc>/i : /<lastmod>\s*([^<]+?)\s*<\/lastmod>/i,
  );
  return m?.[1]?.trim() || null;
}

function sameSiteOrigin(a: string, b: string): boolean {
  const norm = (u: string) => {
    try {
      return new URL(u).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return '';
    }
  };
  const ha = norm(a);
  return ha !== '' && ha === norm(b);
}

function parseUrlset(xml: string, origin: string): SitemapPostUrl[] {
  const out: SitemapPostUrl[] = [];
  const blocks = xml.match(/<url>([\s\S]*?)<\/url>/gi);
  if (!blocks) return out;
  for (const block of blocks) {
    const loc = extractTag(block, 'loc');
    if (!loc || !isHttpUrl(loc)) continue;
    // Same-site match ignoring a www prefix: sitemap hosts routinely list the
    // www variant while seeds use the apex (or vice versa). Still same site.
    if (!sameSiteOrigin(loc, origin)) continue;
    out.push({ url: loc, lastmod: extractTag(block, 'lastmod') });
  }
  return out;
}

type KnownSitemapEntry =
  | string
  | { post_sitemap_range: [number, number] }
  | { wp_post_sitemaps: number[] }
  | { job_posting_range: [number, number] };

/**
 * Expand registry entries (plain URLs + compact ranges) into fetchable sitemap
 * URLs, in listed order. Ranges are Yoast-ordered newest-first (verified live:
 * higher N = older posts), so expansion preserves that order. For
 * post_sitemap_range starting at 1 the unnumbered post-sitemap.xml companion
 * is included (404-skipped when absent). Unknown shapes pass through only if
 * they are plain URL strings; anything else is ignored.
 */
export function expandSitemapEntries(origin: string, entries: readonly unknown[] | undefined): string[] {
  let root = origin;
  try {
    root = new URL(origin).origin;
  } catch {
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (u: string) => {
    if (!isHttpUrl(u) || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  for (const e of entries ?? []) {
    if (typeof e === 'string') {
      push(e.trim());
      continue;
    }
    if (!e || typeof e !== 'object') continue;
    const o = e as Record<string, unknown>;
    if (Array.isArray(o.post_sitemap_range)) {
      const [a, b] = o.post_sitemap_range as number[];
      if (typeof a === 'number' && a <= 1) push(`${root}/post-sitemap.xml`);
      if (typeof a === 'number' && typeof b === 'number') {
        for (let n = Math.max(a, 1); n <= b; n++) push(`${root}/post-sitemap${n}.xml`);
      }
    } else if (Array.isArray(o.wp_post_sitemaps)) {
      for (const n of o.wp_post_sitemaps as unknown[]) {
        if (typeof n === 'number') push(`${root}/wp-sitemap-posts-post-${n}.xml`);
      }
    } else if (Array.isArray(o.job_posting_range)) {
      const [a, b] = o.job_posting_range as number[];
      if (typeof a === 'number' && typeof b === 'number') {
        for (let n = Math.max(a, 1); n <= b; n++) push(`${root}/job_posting-sitemap${n}.xml`);
      }
    }
  }
  return out;
}

function parseIndexChildren(xml: string): string[] {
  const out: string[] = [];
  const blocks = xml.match(/<sitemap>([\s\S]*?)<\/sitemap>/gi);
  if (!blocks) return out;
  for (const block of blocks) {
    const loc = extractTag(block, 'loc');
    if (loc && isHttpUrl(loc)) out.push(loc);
  }
  return out;
}

/**
 * Best-effort sitemap post-URL discovery for one site origin.
 * robots.txt `Sitemap:` lines + `<origin>/sitemap.xml` + `<origin>/wp-sitemap.xml`;
 * follows sitemap indexes recursively (cap 8 child sitemaps per level).
 * Returns [] (never throws) on any failure. No Playwright.
 */
export async function fetchSitemapPostUrls(
  origin: string,
  knownSitemaps?: readonly unknown[],
  watermark?: string | null,
): Promise<{ posts: SitemapPostUrl[]; stats: { childrenFetched: number; earlyStopped: boolean } }> {
  try {
    // Known-list fast path (additive): registry entries (plain URLs + compact
    // ranges, newest-first) are expanded, then fetched in listed order (max 6
    // per call), parsing loc+lastmod exactly like the discovery path below.
    // Early-stop after a child contributing zero URLs with lastmod >= watermark
    // whose max lastmod < watermark. Skipped when no watermark is passed.
    if (knownSitemaps && knownSitemaps.length > 0) {
      const posts: SitemapPostUrl[] = [];
      let childrenFetched = 0;
      let earlyStopped = false;
      const list = expandSitemapEntries(origin, knownSitemaps).slice(0, 6);
      for (const sitemapUrl of list) {
        let leafOrigin = origin;
        try {
          leafOrigin = new URL(sitemapUrl).origin;
        } catch {
          continue;
        }
        const xml = await fetchText(sitemapUrl);
        if (!xml) continue;
        childrenFetched++;
        let childPosts: SitemapPostUrl[] = [];
        if (/<sitemap[\s>]/.test(xml.slice(0, 2000)) || /<sitemapindex[\s>]/.test(xml.slice(0, 2000))) {
          const grandchildren = parseIndexChildren(xml).slice(0, MAX_CHILD_SITEMAPS);
          for (const g of grandchildren) {
            const gXml = await fetchText(g);
            if (!gXml) continue;
            childrenFetched++;
            let gOrigin = leafOrigin;
            try {
              gOrigin = new URL(g).origin;
            } catch {
              continue;
            }
            childPosts.push(...parseUrlset(gXml, gOrigin));
          }
        } else {
          childPosts = parseUrlset(xml, leafOrigin);
        }
        posts.push(...childPosts);
        if (watermark) {
          let newer = 0;
          let max: string | null = null;
          for (const p of childPosts) {
            if (p.lastmod) {
              if (p.lastmod >= watermark) newer++;
              if (!max || p.lastmod > max) max = p.lastmod;
            }
          }
          if (newer === 0 && max !== null && max < watermark) {
            earlyStopped = true;
            break;
          }
        }
      }
      return { posts, stats: { childrenFetched, earlyStopped } };
    }
    let base: URL;
    try {
      base = new URL(origin);
    } catch {
      return { posts: [], stats: { childrenFetched: 0, earlyStopped: false } };
    }
    if (base.protocol !== 'http:' && base.protocol !== 'https:') return { posts: [], stats: { childrenFetched: 0, earlyStopped: false } };
    const root = base.origin;

    const candidates: string[] = [];
    const seen = new Set<string>();
    const push = (u: string) => {
      if (!isHttpUrl(u) || seen.has(u)) return;
      seen.add(u);
      candidates.push(u);
    };

    const robots = await fetchText(`${root}/robots.txt`);
    if (robots) for (const s of parseRobotsSitemaps(robots)) push(s);
    push(`${root}/sitemap.xml`);
    push(`${root}/wp-sitemap.xml`);

    const posts: SitemapPostUrl[] = [];
    let queue = [...candidates];
    // Two levels: top-level files, then one level of index children.
    for (let depth = 0; depth < 2 && queue.length > 0; depth++) {
      const next: string[] = [];
      for (const sitemapUrl of queue) {
        const xml = await fetchText(sitemapUrl);
        if (!xml) continue;
        if (/<sitemap[\s>]/.test(xml.slice(0, 2000)) || /<sitemapindex[\s>]/.test(xml.slice(0, 2000))) {
          for (const child of parseIndexChildren(xml)) {
            if (next.length < MAX_CHILD_SITEMAPS) next.push(child);
          }
        } else {
          posts.push(...parseUrlset(xml, root));
        }
      }
      queue = next;
    }
    return { posts, stats: { childrenFetched: 0, earlyStopped: false } };
  } catch {
    return { posts: [], stats: { childrenFetched: 0, earlyStopped: false } };
  }
}

/**
 * Daily index refresh helper (log-only discovery): fetch `<origin>/robots.txt`,
 * take the first `Sitemap:` URL containing 'index' (case-insensitive) else
 * `<origin>/sitemap_index.xml`; fetch it and return child locs matching
 * /post[-_]?sitemap/i. [] on any failure, never throws.
 */
export async function listPostSitemapChildren(origin: string): Promise<string[]> {
  try {
    let root: string;
    try {
      const base = new URL(origin);
      if (base.protocol !== 'http:' && base.protocol !== 'https:') return [];
      root = base.origin;
    } catch {
      return [];
    }
    const robots = await fetchText(`${root}/robots.txt`);
    let indexUrl: string | null = null;
    if (robots) {
      for (const s of parseRobotsSitemaps(robots)) {
        if (s.toLowerCase().includes('index')) {
          indexUrl = s;
          break;
        }
      }
    }
    if (!indexUrl) indexUrl = `${root}/sitemap_index.xml`;
    const xml = await fetchText(indexUrl);
    if (!xml) return [];
    return parseIndexChildren(xml).filter((loc) => /post[-_]?sitemap/i.test(loc));
  } catch {
    return [];
  }
}
