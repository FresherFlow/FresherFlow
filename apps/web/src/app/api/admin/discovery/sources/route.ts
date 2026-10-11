import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/api/rateLimit';
import { withAdminAuth } from '@/lib/server/adminAuth';
import { hasR2Read, readJsonFromR2 } from '@/lib/server/r2read';

export const dynamic = 'force-dynamic';

// ─── Source health dashboard (admin-only) ────────────────────────────────────
// CDN/R2 ONLY — this route never touches any database (neither main Prisma
// nor the ingestion DB). Reads fail, they fail loud in the console. Why:
// per-site truth (fetch health, links seen, jobs out per run) lives in the
// R2 health ledger written by every discovery run
// (packages/pipeline/src/utils/source-health.ts); the site census lives in
// CDN aggregators.json. Hospital rule: a read-only dashboard must not gain
// a database dependency to show operational stats.
// Days are bucketed in Asia/Kolkata (admin audience), not UTC.

export interface SourceDailyPoint {
  d: string; // YYYY-MM-DD (IST)
  jobs: number;
}

export interface SiteRow {
  id: string; // 'site:Naukri' | 'channel:xyz'
  kind: 'site' | 'channel';
  name: string;
  configured: boolean;
  govtOnly: boolean;
  fetch: string | null; // last fetch: ok|empty|error|skipped, null when unknown
  lastRun: string | null; // YYYY-MM-DD of last ledger entry
  links7d: number | null;
  jobs7d: number;
  jobsPrior7d: number;
  totalLinks: number;
  totalJobs: number;
  daily: SourceDailyPoint[]; // zero-filled, oldest → newest, length = days
}

export interface SourcesPayload {
  days: number;
  generatedAt: string;
  totals: {
    sites: number;
    channels: number;
    links7d: number;
    jobs7d: number;
    troubled: number;
  };
  ledgerAvailable: boolean;
  census: {
    sites: Array<{ name: string; urls: string[]; govtOnly: boolean }>;
    channels: string[];
  };
  siteHealth: SiteRow[];
}

// ─── Census: configured sites + channels from CDN aggregators.json ──────────
// Public config, short cache. Shape mirrors the pipeline's TargetSite
// ({name, urls, govtUrls?}) plus telegram_channels — spelled out here so web
// never imports pipeline code.

interface CensusSite {
  name: string;
  urls: string[];
  govtOnly: boolean;
}

interface Census {
  sites: CensusSite[];
  channels: string[];
}

const CENSUS_TTL_MS = 5 * 60_000;
let censusCache: { at: number; data: Census } | null = null;

function cdnBase(): string {
  return (process.env.NEXT_PUBLIC_CDN_URL || '').trim().replace(/\/$/, '');
}

async function loadCensus(): Promise<Census> {
  if (censusCache && Date.now() - censusCache.at < CENSUS_TTL_MS) return censusCache.data;
  const empty: Census = { sites: [], channels: [] };
  const base = cdnBase();
  if (!base) return empty;
  try {
    const res = await fetch(`${base}/aggregators.json`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return empty;
    const raw = (await res.json()) as any;
    const list: any[] = Array.isArray(raw) ? raw : raw?.sites ?? [];
    const sites: CensusSite[] = list
      .filter((s) => s && typeof s.name === 'string')
      .map((s) => ({
        name: s.name,
        urls: Array.isArray(s.urls) ? s.urls.filter((u: unknown): u is string => typeof u === 'string') : [],
        govtOnly: !(Array.isArray(s.urls) && s.urls.length > 0),
      }));
    const channelsRaw = raw?.telegram_channels ?? raw?.channel_list ?? [];
    const channels = Array.isArray(channelsRaw) ? channelsRaw.filter((c: unknown): c is string => typeof c === 'string') : [];
    const data = { sites, channels };
    censusCache = { at: Date.now(), data };
    return data;
  } catch {
    return censusCache?.data ?? empty;
  }
}

// ─── Ledger: R2 health files → per-site/channel rows ─────────────────────────

interface LedgerDay {
  d: string;
  fetch: string;
  links: number;
  jobs: number;
  review: number;
  err?: string;
}

interface LedgerRecord {
  id: string;
  kind: string;
  name: string;
  firstSeen: string;
  totalLinks: number;
  totalJobs: number;
  days: LedgerDay[];
}

interface LedgerFile {
  version?: number;
  updatedAt?: string;
  configured?: string[];
  sources?: Record<string, LedgerRecord>;
}

async function loadLedger(): Promise<{ available: boolean; records: Map<string, LedgerRecord> }> {
  const records = new Map<string, LedgerRecord>();
  if (!hasR2Read) return { available: false, records };
  let available = true;
  for (const key of ['discovery-state/health/ats.json', 'discovery-state/health/aggregators.json']) {
    const file = await readJsonFromR2<LedgerFile>(key);
    if (!file || typeof file.sources !== 'object') {
      available = false;
      continue;
    }
    for (const [id, rec] of Object.entries(file.sources)) {
      if (rec && typeof rec === 'object' && Array.isArray(rec.days)) records.set(id, rec);
    }
  }
  return { available, records };
}

/**
 * Census left-joined with ledger history: every configured site/channel gets
 * a row even with zero runs (numbers null → page renders "—"). Ledger-only
 * ids (removed from config) are appended and flagged configured:false.
 */
function buildSiteHealth(
  census: Census,
  records: Map<string, LedgerRecord>,
  dayAxis: string[],
  cutoff7: string,
  cutoffPrior: string
): SiteRow[] {
  const rows: SiteRow[] = [];
  const seen = new Set<string>();

  const pushRow = (id: string, kind: 'site' | 'channel', name: string, configured: boolean, govtOnly: boolean) => {
    if (seen.has(id)) return;
    seen.add(id);
    const rec = records.get(id);
    const daily: SourceDailyPoint[] = dayAxis.map((d) => ({ d, jobs: 0 }));
    let links7d: number | null = null;
    let jobs7d = 0;
    let jobsPrior7d = 0;
    let fetch: string | null = null;
    let lastRun: string | null = null;
    let totalLinks = 0;
    let totalJobs = 0;
    if (rec) {
      totalLinks = Number(rec.totalLinks) || 0;
      totalJobs = Number(rec.totalJobs) || 0;
      links7d = 0;
      for (const e of rec.days || []) {
        const slot = daily.find((p) => p.d === e.d);
        const jobs = Number(e.jobs) || 0;
        if (slot) slot.jobs += jobs;
        if (e.d >= cutoff7) {
          links7d += Number(e.links) || 0;
          jobs7d += jobs;
        } else if (e.d >= cutoffPrior) {
          jobsPrior7d += jobs;
        }
      }
      const sorted = [...(rec.days || [])].sort((a, b) => (a.d < b.d ? -1 : 1));
      const last = sorted[sorted.length - 1];
      if (last) {
        fetch = last.fetch;
        lastRun = last.d;
      }
    }
    rows.push({
      id, kind, name, configured, govtOnly, fetch, lastRun,
      links7d, jobs7d, jobsPrior7d, totalLinks, totalJobs, daily,
    });
  };

  for (const s of census.sites) pushRow(`site:${s.name}`, 'site', s.name, true, s.govtOnly);
  for (const c of census.channels) pushRow(`channel:${c}`, 'channel', c, true, false);
  for (const [id, rec] of records) {
    if (id.startsWith('ats:')) continue; // ATS providers are not sites/channels
    const kind = rec.kind === 'channel' ? 'channel' : 'site';
    pushRow(id, kind, rec.name || id, false, false);
  }

  rows.sort((a, b) => b.jobs7d - a.jobs7d || b.totalJobs - a.totalJobs || a.name.localeCompare(b.name));
  return rows;
}

async function getSources(request: NextRequest) {
  const url = new URL(request.url);
  const rawDays = Number(url.searchParams.get('days') ?? 30);
  const days = Number.isFinite(rawDays) ? Math.min(90, Math.max(7, Math.floor(rawDays))) : 30;

  const [census, ledger] = await Promise.all([loadCensus(), loadLedger()]);

  // Zero-filled day axis, oldest → newest (IST calendar days).
  const dayAxis: string[] = [];
  const todayIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(todayIST);
    d.setDate(d.getDate() - i);
    dayAxis.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  const cutoff7 = dayAxis[dayAxis.length - 7];
  const cutoffPrior = dayAxis[dayAxis.length - 14] ?? dayAxis[0];

  const siteHealth = buildSiteHealth(census, ledger.records, dayAxis, cutoff7, cutoffPrior);
  const troubled = siteHealth.filter((r) => r.fetch === 'error').length;

  const payload: SourcesPayload = {
    days,
    generatedAt: new Date().toISOString(),
    totals: {
      sites: census.sites.length,
      channels: census.channels.length,
      links7d: siteHealth.reduce((t, r) => t + (r.links7d ?? 0), 0),
      jobs7d: siteHealth.reduce((t, r) => t + r.jobs7d, 0),
      troubled,
    },
    ledgerAvailable: ledger.available && ledger.records.size > 0,
    census,
    siteHealth,
  };
  return NextResponse.json(payload);
}

export const GET = withRateLimit(withAdminAuth(getSources), { windowMs: 60_000, max: 30, keyPrefix: 'discovery-sources' });
