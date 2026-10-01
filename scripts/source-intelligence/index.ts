/**
 * Source Intelligence — a read-only, CDN-only report over the discovery pipeline.
 *
 * It answers, for every configured aggregator site and Telegram channel:
 *   - does it exist?                      (aggregators.json)
 *   - is it posting, and how many/day?    (jobs/discovered.json, `source` + `discoveredAt`)
 *   - what links does it produce?         (same ledger + per-site visited shards)
 *   - which of those links are live?      (HEAD check, cached to the CDN)
 *
 * It touches no database and no Prisma schema. Every input is a public CDN
 * object the bots already write; the only output is an HTML file plus a small
 * link-health cache, both uploaded to the same R2/CDN the bots use.
 *
 * Run:  pnpm --filter ./scripts/source-intelligence start
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { CDN_URL, loadEnv, fetchJsonWithRetry } from '@fresherflow/pipeline';
import { uploadJsonToR2, uploadHtmlToR2 } from '@fresherflow/utils/r2';

loadEnv();

// ── Tunables (env-overridable) ───────────────────────────────────────────────

const LINK_CHECK_CONCURRENCY = intEnv('SOURCE_INTEL_LINK_CONCURRENCY', 12);
const LINK_CHECK_TIMEOUT_MS = intEnv('SOURCE_INTEL_LINK_TIMEOUT_MS', 8_000);
/** 0 = no cap. A cap keeps a first run honest about cost. */
const MAX_LINK_CHECKS = intEnv('SOURCE_INTEL_MAX_LINKS', 3_000);
/** Re-check a verdict after this long. */
const LINK_CACHE_TTL_MS = intEnv('SOURCE_INTEL_CACHE_TTL_MS', 7 * 24 * 60 * 60 * 1000);
const VISITED_CONCURRENCY = intEnv('SOURCE_INTEL_VISITED_CONCURRENCY', 8);
const MAX_LINKS_PER_SOURCE = intEnv('SOURCE_INTEL_MAX_LINKS_PER_SOURCE', 200);
const UPLOAD = process.env.SOURCE_INTEL_UPLOAD !== 'false';
const OUT_FILE = process.env.SOURCE_INTEL_OUT || 'source-intelligence.html';

function intEnv(name: string, fallback: number): number {
    const raw = (process.env[name] || '').trim();
    if (!raw) return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface AggregatorSite {
    id?: number;
    name: string;
    urls?: string[];
    govtUrls?: string[];
    telegram_channel?: string;
    sitemaps?: unknown[];
}

interface AggregatorsConfig {
    telegram_channels?: string[];
    priority_channels?: string[];
    sites?: AggregatorSite[];
}

interface DiscoveredJob {
    title?: string;
    company?: string;
    applyLink?: string;
    source?: string;
    sourceType?: string;
    aggregatorUrl?: string;
    discoveredAt?: string;
}

type LinkStatus = 'LIVE' | 'DEAD' | 'UNKNOWN';

interface CachedLink {
    status: LinkStatus;
    code: number | null;
    checkedAt: string;
}

interface LinkCache {
    updatedAt: string;
    links: Record<string, CachedLink>;
}

interface SourceLink {
    url: string;
    at: string | null;
    title: string;
    status: LinkStatus;
}

interface SourceRow {
    name: string;
    kind: 'site' | 'channel';
    priority: boolean;
    /** For a site: the channel it cross-posts to, if configured. */
    channel: string | null;
    configuredUrls: number;
    /** Sites only: how many source pages the crawler has recorded in its visited shard. */
    crawledPages: number | null;
    today: number;
    yesterday: number;
    last7: number;
    last30: number;
    total: number;
    lastActivity: string | null;
    live: number;
    dead: number;
    unknown: number;
    links: SourceLink[];
}

interface Report {
    generatedAt: string;
    cdn: string;
    summary: {
        sitesConfigured: number;
        channelsConfigured: number;
        priorityChannels: number;
        sourcesWithActivity: number;
        sourcesDormant: number;
        linksTracked: number;
        linksLive: number;
        linksDead: number;
        linksUnknown: number;
        jobsInLedger: number;
        ledgerOldest: string | null;
    };
    sites: SourceRow[];
    channels: SourceRow[];
    gc: { visitedShardsMissing: number; cacheFresh: number; cacheRechecked: number };
}

// ── Small helpers ────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Run `worker` over `items` with a fixed number of concurrent slots. */
async function pMap<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    const runners = Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, async () => {
        while (true) {
            const i = next++;
            if (i >= items.length) return;
            results[i] = await worker(items[i]);
        }
    });
    await Promise.all(runners);
    return results;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDayKey(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return null;
    return new Date(t).toISOString().slice(0, 10);
}

function todayKey(offsetDays = 0): string {
    return new Date(Date.now() - offsetDays * DAY_MS).toISOString().slice(0, 10);
}

async function fetchJson<T>(url: string, label: string, timeoutMs = 30_000): Promise<T | null> {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
        if (!res.ok) {
            console.warn(`  ✗ ${label}: HTTP ${res.status}`);
            return null;
        }
        return (await res.json()) as T;
    } catch (err) {
        console.warn(`  ✗ ${label}: ${err instanceof Error ? err.message : String(err)}`);
        return null;
    }
}

// ── Link health ──────────────────────────────────────────────────────────────

async function checkLink(url: string): Promise<CachedLink> {
    const checkedAt = new Date().toISOString();
    try {
        new URL(url);
    } catch {
        return { status: 'UNKNOWN', code: null, checkedAt };
    }

    const attempt = async (method: 'HEAD' | 'GET'): Promise<CachedLink | null> => {
        try {
            const res = await fetch(url, {
                method,
                redirect: 'follow',
                signal: AbortSignal.timeout(LINK_CHECK_TIMEOUT_MS),
                headers: method === 'GET' ? { Range: 'bytes=0-0' } : undefined,
            });
            const code = res.status;
            // Drain/cancel the body so keep-alive sockets are not left dangling.
            try {
                await res.body?.cancel();
            } catch {
                /* ignore */
            }
            if (code >= 200 && code < 400) return { status: 'LIVE', code, checkedAt };
            if (code === 404 || code === 410) return { status: 'DEAD', code, checkedAt };
            if (code === 405 || code === 501) return null; // method unsupported — try the other
            // 401/403/429/5xx are ambiguous: the server answered, so the link is
            // not provably dead. Never report a false DEAD.
            return { status: 'UNKNOWN', code, checkedAt };
        } catch {
            return null;
        }
    };

    const head = await attempt('HEAD');
    if (head) return head;
    const get = await attempt('GET');
    if (get) return get;
    // Hard network/DNS failure on both methods. The sweeper treats this as
    // expired; we mirror that.
    return { status: 'DEAD', code: null, checkedAt };
}

function needsCheck(cached: CachedLink | undefined, now: number): boolean {
    if (!cached) return true;
    const age = now - Date.parse(cached.checkedAt);
    if (Number.isNaN(age)) return true;
    if (age > LINK_CACHE_TTL_MS) return true;
    // Retry ambiguous verdicts sooner than clear ones.
    if (cached.status === 'UNKNOWN' && age > DAY_MS) return true;
    return false;
}

// ── Report assembly ──────────────────────────────────────────────────────────

function siteSourceName(job: DiscoveredJob): { kind: 'site' | 'channel'; name: string } | null {
    const source = (job.source || '').trim();
    if (!source) return null;
    if (source.startsWith('channel-')) return { kind: 'channel', name: source.slice('channel-'.length) };
    // ATS/board sources are not part of this board (they live in the ATS registry).
    if (job.sourceType === 'ATS') return null;
    return { kind: 'site', name: source };
}

async function buildReport(): Promise<Report> {
    const generatedAt = new Date().toISOString();
    console.log(`\n=== Source Intelligence ===\nCDN: ${CDN_URL}\n`);

    // 1. Inventory — what exists.
    const configRes = await fetchJsonWithRetry<AggregatorsConfig>(`${CDN_URL}/aggregators.json`, {
        label: 'aggregators.json',
        attempts: 2,
        timeoutMs: 15_000,
        validate: (d: unknown) => typeof d === 'object' && d !== null,
    });
    const config: AggregatorsConfig = configRes.ok && configRes.data ? configRes.data : {};
    const channels = Array.isArray(config.telegram_channels) ? config.telegram_channels : [];
    const priority = new Set(Array.isArray(config.priority_channels) ? config.priority_channels : []);
    const sites = Array.isArray(config.sites) ? config.sites : [];
    console.log(`Loaded ${sites.length} site(s), ${channels.length} channel(s), ${priority.size} priority.`);

    // 2. Ledger — what has been found. Plain fetch: this object can exceed 2 MB.
    const ledger = await fetchJson<{ jobs?: DiscoveredJob[] } | DiscoveredJob[]>(
        `${CDN_URL}/jobs/discovered.json`,
        'jobs/discovered.json',
        60_000,
    );
    const jobs: DiscoveredJob[] = Array.isArray(ledger) ? ledger : ledger?.jobs ?? [];
    console.log(`Ledger: ${jobs.length} job(s).`);

    // Seed every configured source so silent ones are visible, not missing.
    const rows = new Map<string, SourceRow>();
    const keyOf = (kind: 'site' | 'channel', name: string) => `${kind}:${name}`;
    const seed = (row: SourceRow) => rows.set(keyOf(row.kind, row.name), row);

    for (const s of sites) {
        seed({
            name: s.name,
            kind: 'site',
            priority: false,
            channel: s.telegram_channel ?? null,
            configuredUrls: (s.urls?.length ?? 0) + (s.govtUrls?.length ?? 0),
            crawledPages: null,
            today: 0, yesterday: 0, last7: 0, last30: 0, total: 0,
            lastActivity: null, live: 0, dead: 0, unknown: 0, links: [],
        });
    }
    for (const c of channels) {
        seed({
            name: c,
            kind: 'channel',
            priority: priority.has(c),
            channel: null,
            configuredUrls: 0,
            crawledPages: null,
            today: 0, yesterday: 0, last7: 0, last30: 0, total: 0,
            lastActivity: null, live: 0, dead: 0, unknown: 0, links: [],
        });
    }

    // 3. Fold the ledger into per-source buckets.
    const t0 = todayKey(0);
    const t1 = todayKey(1);
    const d7 = new Date(Date.now() - 6 * DAY_MS).toISOString().slice(0, 10);
    const d30 = new Date(Date.now() - 29 * DAY_MS).toISOString().slice(0, 10);
    const linkOwners = new Map<string, Set<string>>(); // url -> sources
    let ledgerOldest: string | null = null;

    for (const job of jobs) {
        const owner = siteSourceName(job);
        if (!owner) continue;
        const key = keyOf(owner.kind, owner.name);
        let row = rows.get(key);
        if (!row) {
            // Unconfigured source still producing — surface it rather than hide it.
            row = {
                name: owner.name, kind: owner.kind, priority: false, channel: null,
                configuredUrls: 0, crawledPages: null,
                today: 0, yesterday: 0, last7: 0, last30: 0, total: 0,
                lastActivity: null, live: 0, dead: 0, unknown: 0, links: [],
            };
            seed(row);
        }

        const day = utcDayKey(job.discoveredAt);
        row.total += 1;
        if (day) {
            if (day === t0) row.today += 1;
            if (day === t1) row.yesterday += 1;
            if (day >= d7) row.last7 += 1;
            if (day >= d30) row.last30 += 1;
            if (!row.lastActivity || day > row.lastActivity) row.lastActivity = day;
            if (!ledgerOldest || day < ledgerOldest) ledgerOldest = day;
        }

        const url = (job.applyLink || '').trim();
        if (url) {
            row.links.push({ url, at: job.discoveredAt ?? null, title: job.title || job.company || '', status: 'UNKNOWN' });
            if (!linkOwners.has(url)) linkOwners.set(url, new Set());
            linkOwners.get(url)!.add(key);
        }
    }

    // 4. Per-site crawl evidence (visited shards).
    const siteRows = [...rows.values()].filter((r) => r.kind === 'site');
    let visitedShardsMissing = 0;
    await pMap(siteRows, VISITED_CONCURRENCY, async (row) => {
        const list = await fetchJson<string[]>(
            `${CDN_URL}/discovery-state/visited/aggregators/${encodeURIComponent(row.name)}.json`,
            `visited/${row.name}`,
            20_000,
        );
        if (list === null) {
            visitedShardsMissing += 1;
            return;
        }
        row.crawledPages = Array.isArray(list) ? list.length : null;
    });

    // 5. Link health — read the cache, check only what is stale or new.
    const cache = (await fetchJson<LinkCache>(`${CDN_URL}/source-health/links.json`, 'source-health cache', 20_000)) ?? {
        updatedAt: generatedAt,
        links: {},
    };
    const cacheLinks = cache.links ?? {};
    const uniqueUrls = [...linkOwners.keys()];
    const now = Date.now();
    const toCheck = uniqueUrls.filter((u) => needsCheck(cacheLinks[u], now));
    const capped = MAX_LINK_CHECKS > 0 ? toCheck.slice(0, MAX_LINK_CHECKS) : toCheck;
    console.log(`Links: ${uniqueUrls.length} tracked, ${toCheck.length} stale/missing, checking ${capped.length}.`);

    let done = 0;
    const fresh = await pMap(capped, LINK_CHECK_CONCURRENCY, async (url) => {
        const verdict = await checkLink(url);
        done += 1;
        if (done % 50 === 0) console.log(`  … checked ${done}/${capped.length}`);
        return [url, verdict] as const;
    });
    for (const [url, verdict] of fresh) cacheLinks[url] = verdict;

    const nextCache: LinkCache = { updatedAt: generatedAt, links: cacheLinks };

    // 6. Attach verdicts to rows.
    let linksLive = 0, linksDead = 0, linksUnknown = 0;
    for (const url of uniqueUrls) {
        const status = cacheLinks[url]?.status ?? 'UNKNOWN';
        if (status === 'LIVE') linksLive += 1;
        else if (status === 'DEAD') linksDead += 1;
        else linksUnknown += 1;
    }
    for (const row of rows.values()) {
        const seen = new Set<string>();
        row.links = row.links
            .filter((l) => {
                if (seen.has(l.url)) return false;
                seen.add(l.url);
                return true;
            })
            .map((l) => ({ ...l, status: cacheLinks[l.url]?.status ?? 'UNKNOWN' }))
            .sort((a, b) => (b.at || '').localeCompare(a.at || ''))
            .slice(0, MAX_LINKS_PER_SOURCE);
        for (const l of row.links) {
            if (l.status === 'LIVE') row.live += 1;
            else if (l.status === 'DEAD') row.dead += 1;
            else row.unknown += 1;
        }
    }

    // 7. Persist the cache so the next run is cheap and the status is shared.
    const bucket = (process.env.R2_BUCKET_NAME || '').trim();
    if (UPLOAD && bucket) {
        await uploadJsonToR2(nextCache, bucket, 'source-health/links.json');
    } else if (UPLOAD) {
        console.warn('R2_BUCKET_NAME not set — link-health cache not uploaded.');
    }

    const all = [...rows.values()];
    const siteList = all.filter((r) => r.kind === 'site').sort(sortRows);
    const channelList = all.filter((r) => r.kind === 'channel').sort(sortRows);

    return {
        generatedAt,
        cdn: CDN_URL,
        summary: {
            sitesConfigured: sites.length,
            channelsConfigured: channels.length,
            priorityChannels: priority.size,
            sourcesWithActivity: all.filter((r) => r.total > 0).length,
            sourcesDormant: all.filter((r) => r.total === 0).length,
            linksTracked: uniqueUrls.length,
            linksLive,
            linksDead,
            linksUnknown,
            jobsInLedger: jobs.length,
            ledgerOldest,
        },
        sites: siteList,
        channels: channelList,
        gc: {
            visitedShardsMissing,
            cacheFresh: uniqueUrls.length - capped.length,
            cacheRechecked: capped.length,
        },
    };
}

function sortRows(a: SourceRow, b: SourceRow): number {
    if (a.total !== b.total) return b.total - a.total;
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    return a.name.localeCompare(b.name);
}

// ── Rendering ────────────────────────────────────────────────────────────────

function renderHtml(report: Report): string {
    const data = JSON.stringify(report).replace(/</g, '\\u003c');
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Source Intelligence — FresherFlow discovery</title>
<style>
  :root{--bg:#0b0f14;--panel:#111823;--panel2:#0e141d;--line:#1e2a38;--text:#e6edf5;--muted:#8b9bb0;--accent:#4da3ff;--live:#2ecc71;--dead:#ff5c5c;--unk:#c9a227;--prio:#8b5cf6}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  header{position:sticky;top:0;z-index:5;background:linear-gradient(180deg,#0b0f14,#0b0f14ee);border-bottom:1px solid var(--line);padding:18px 22px}
  h1{margin:0 0 2px;font-size:18px;letter-spacing:.2px}
  .sub{color:var(--muted);font-size:12px}
  .cards{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 14px;min-width:104px}
  .card b{display:block;font-size:20px;line-height:1.2}
  .card span{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.6px}
  .controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:14px}
  .chip{cursor:pointer;border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:999px;padding:5px 12px;font-size:12px}
  .chip[aria-pressed="true"]{border-color:var(--accent);color:var(--accent)}
  input[type=search]{background:var(--panel2);border:1px solid var(--line);color:var(--text);border-radius:8px;padding:7px 11px;min-width:220px}
  main{padding:18px 22px 60px}
  h2{font-size:14px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted);margin:26px 0 10px}
  table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:10px;overflow:hidden}
  th,td{text-align:left;padding:9px 11px;border-bottom:1px solid var(--line);white-space:nowrap}
  th{font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);background:var(--panel2)}
  tbody tr:hover{background:#0f1621}
  td.name{font-weight:600}
  td.num{text-align:right;font-variant-numeric:tabular-nums}
  .badge{display:inline-block;border-radius:999px;padding:1px 8px;font-size:11px;border:1px solid var(--line)}
  .badge.live{color:var(--live);border-color:#1f5c39}
  .badge.dead{color:var(--dead);border-color:#5c2222}
  .badge.unk{color:var(--unk);border-color:#5c4f1f}
  .tag{display:inline-block;margin-left:6px;font-size:10px;color:var(--prio);border:1px solid #3a2a63;border-radius:4px;padding:0 5px}
  .dormant td.name{color:var(--muted)}
  details{color:var(--muted)}
  details summary{cursor:pointer;color:var(--accent)}
  .linklist{max-height:260px;overflow:auto;margin:8px 0 0;padding:8px 10px;background:var(--panel2);border:1px solid var(--line);border-radius:8px;white-space:normal;word-break:break-all}
  .linklist div{padding:3px 0;border-bottom:1px dashed #16202c;display:flex;gap:8px;align-items:baseline}
  .linklist a{color:var(--text);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
  .linklist a:hover{color:var(--accent)}
  .foot{color:var(--muted);font-size:12px;margin-top:24px}
  code{background:var(--panel2);border:1px solid var(--line);border-radius:5px;padding:1px 5px;font-size:12px}
</style>
</head>
<body>
<header>
  <h1>Source Intelligence</h1>
  <div class="sub" id="sub">Loading…</div>
  <div class="cards" id="cards"></div>
  <div class="controls">
    <button class="chip" data-f="all" aria-pressed="true">All</button>
    <button class="chip" data-f="site" aria-pressed="false">Sites</button>
    <button class="chip" data-f="channel" aria-pressed="false">Channels</button>
    <button class="chip" data-f="priority" aria-pressed="false">Priority</button>
    <button class="chip" data-f="active" aria-pressed="false">Active</button>
    <button class="chip" data-f="dormant" aria-pressed="false">Dormant</button>
    <input type="search" id="q" placeholder="Filter by name / link…" />
  </div>
</header>
<main>
  <h2>Sites <span id="siteCount"></span></h2>
  <table><thead><tr>
    <th>Site</th><th>Channel</th><th>URLs</th><th>Crawled</th>
    <th>Today</th><th>Yest.</th><th>7d</th><th>30d</th><th>Total</th><th>Last</th><th>Live</th><th>Dead</th><th>Links</th>
  </tr></thead><tbody id="siteBody"></tbody></table>

  <h2>Channels <span id="chanCount"></span></h2>
  <table><thead><tr>
    <th>Channel</th><th>Priority</th>
    <th>Today</th><th>Yest.</th><th>7d</th><th>30d</th><th>Total</th><th>Last</th><th>Live</th><th>Dead</th><th>Links</th>
  </tr></thead><tbody id="chanBody"></tbody></table>

  <div class="foot" id="foot"></div>
</main>
<script>
var DATA = ${data};
var filter = 'all';
var query = '';

function badge(s){var c=s==='LIVE'?'live':s==='DEAD'?'dead':'unk';return '<span class="badge '+c+'">'+s+'</span>';}
function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch];});}
function num(n){return '<td class="num">'+(n||0)+'</td>';}

function linksCell(row){
  if(!row.links.length) return '<td class="num">0</td>';
  var items=row.links.map(function(l){
    return '<div>'+badge(l.status)+'<a href="'+esc(l.url)+'" target="_blank" rel="noopener">'+esc(l.url)+'</a></div>';
  }).join('');
  return '<td><details><summary>'+row.links.length+'</summary><div class="linklist">'+items+'</div></details></td>';
}

function matches(row){
  if(query){
    var q=query.toLowerCase();
    var hay=(row.name+' '+row.links.map(function(l){return l.url;}).join(' ')).toLowerCase();
    if(hay.indexOf(q)===-1) return false;
  }
  if(filter==='site') return row.kind==='site';
  if(filter==='channel') return row.kind==='channel';
  if(filter==='priority') return !!row.priority;
  if(filter==='active') return row.total>0;
  if(filter==='dormant') return row.total===0;
  return true;
}

function rowHtml(row){
  var cls=row.total===0?'dormant':'';
  var nameTd='<td class="name">'+esc(row.name)+(row.priority?'<span class="tag">priority</span>':'')+'</td>';
  var common=num(row.today)+num(row.yesterday)+num(row.last7)+num(row.last30)+num(row.total)+'<td>'+(row.lastActivity||'—')+'</td>';
  if(row.kind==='site'){
    return '<tr class="'+cls+'" data-kind="site" data-name="'+esc(row.name)+'">'+nameTd+
      '<td>'+(row.channel?esc(row.channel):'—')+'</td>'+
      '<td class="num">'+row.configuredUrls+'</td>'+
      '<td class="num">'+(row.crawledPages==null?'—':row.crawledPages)+'</td>'+
      common+
      '<td class="num"><span class="badge live">'+row.live+'</span></td>'+
      '<td class="num"><span class="badge '+(row.dead?'dead':'')+'">'+row.dead+'</span></td>'+
      linksCell(row)+'</tr>';
  }
  return '<tr class="'+cls+'" data-kind="channel" data-name="'+esc(row.name)+'">'+nameTd+
    '<td>'+(row.priority?'yes':'—')+'</td>'+common+
    '<td class="num"><span class="badge live">'+row.live+'</span></td>'+
    '<td class="num"><span class="badge '+(row.dead?'dead':'')+'">'+row.dead+'</span></td>'+
    linksCell(row)+'</tr>';
}

function render(){
  var sites=DATA.sites.filter(matches), chans=DATA.channels.filter(matches);
  document.getElementById('siteBody').innerHTML=sites.map(rowHtml).join('')||'<tr><td colspan="13">No sites match.</td></tr>';
  document.getElementById('chanBody').innerHTML=chans.map(rowHtml).join('')||'<tr><td colspan="11">No channels match.</td></tr>';
  document.getElementById('siteCount').textContent='('+sites.length+')';
  document.getElementById('chanCount').textContent='('+chans.length+')';
}

function cards(){
  var s=DATA.summary;
  var defs=[
    ['Sites',s.sitesConfigured],['Channels',s.channelsConfigured],['Priority',s.priorityChannels],
    ['Active',s.sourcesWithActivity],['Dormant',s.sourcesDormant],
    ['Links tracked',s.linksTracked],['Live',s.linksLive],['Dead',s.linksDead],['Unknown',s.linksUnknown]
  ];
  document.getElementById('cards').innerHTML=defs.map(function(d){
    return '<div class="card"><b>'+d[1]+'</b><span>'+d[0]+'</span></div>';
  }).join('');
  document.getElementById('sub').textContent='Generated '+DATA.generatedAt+' · ledger '+s.jobsInLedger+' jobs'+
    (s.ledgerOldest?(' since '+s.ledgerOldest):'')+' · source '+DATA.cdn;
  var g=DATA.gc;
  document.getElementById('foot').textContent='Checked '+g.cacheRechecked+' links this run, '+g.cacheFresh+
    ' reused from cache. '+g.visitedShardsMissing+' site crawl shard(s) missing on the CDN. '+
    'Read-only over CDN JSON — no database touched.';
}

document.querySelectorAll('.chip').forEach(function(btn){
  btn.addEventListener('click',function(){
    filter=btn.getAttribute('data-f');
    document.querySelectorAll('.chip').forEach(function(b){b.setAttribute('aria-pressed',String(b===btn));});
    render();
  });
});
document.getElementById('q').addEventListener('input',function(e){query=e.target.value;render();});

cards(); render();
</script>
</body>
</html>`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const report = await buildReport();

    const html = renderHtml(report);
    const outPath = path.resolve(process.cwd(), OUT_FILE);
    await fs.writeFile(outPath, html, 'utf8');
    console.log(`\nWrote ${outPath}`);

    const bucket = (process.env.R2_BUCKET_NAME || '').trim();
    if (UPLOAD && bucket) {
        await uploadHtmlToR2(html, bucket, 'source-intelligence/index.html');
        console.log(`Published to ${CDN_URL}/source-intelligence/index.html`);
    }

    const s = report.summary;
    console.log(
        `\nSummary: ${s.sitesConfigured} sites, ${s.channelsConfigured} channels, ` +
        `${s.sourcesWithActivity} active / ${s.sourcesDormant} dormant, ` +
        `${s.linksTracked} links (${s.linksLive} live, ${s.linksDead} dead, ${s.linksUnknown} unknown).`,
    );
}

main().catch((err) => {
    console.error('Source Intelligence failed:', err);
    process.exit(1);
});
