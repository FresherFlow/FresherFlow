// Source health dashboard — transport + view types.
// Payload shape owned by `app/api/admin/discovery/sources/route.ts`
// (SourcesPayload). Mirrored here (not imported) because `features/` must
// not depend on `app/` — the route owns the shape; this names it at the
// view boundary. CDN/R2 only: no database types here by design.

export interface SourceDailyPoint {
  d: string; // YYYY-MM-DD (IST)
  jobs: number;
}

export interface CensusSite {
  name: string;
  urls: string[];
  govtOnly: boolean;
}

export interface SiteRow {
  id: string; // 'site:Naukri' | 'channel:xyz'
  kind: 'site' | 'channel';
  name: string;
  configured: boolean;
  govtOnly: boolean;
  fetch: string | null; // last fetch: ok|empty|error|skipped, null = no ledger yet
  lastRun: string | null; // YYYY-MM-DD
  links7d: number | null;
  jobs7d: number;
  jobsPrior7d: number;
  totalLinks: number;
  totalJobs: number;
  daily: SourceDailyPoint[];
}

export interface SourcesTotals {
  sites: number;
  channels: number;
  links7d: number;
  jobs7d: number;
  troubled: number;
}

export interface SourcesPayload {
  days: number;
  generatedAt: string;
  totals: SourcesTotals;
  ledgerAvailable: boolean;
  census: {
    sites: CensusSite[];
    channels: string[];
  };
  siteHealth: SiteRow[];
}

// Site/channel verdicts — fetch-aware from the start, because for sites the
// fetch signal is the whole point: dead vs quiet is the question.
export type SiteVerdict = 'dead' | 'declining' | 'quiet' | 'idle' | 'healthy' | 'unknown';
