import type { SiteRow, SiteVerdict } from './types';

/**
 * Pure site/channel classifier — no I/O, so it is unit-testable and safe to
 * extend. Fetch-aware from the start:
 * - dead:      last fetch errored. The source is broken, not quiet.
 * - declining: output halved or worse vs prior 7d (prior >= 5 filters noise
 *              on tiny sources).
 * - quiet:     fetching fine but zero jobs in 7d after real history — the
 *              site may have changed structure or run dry.
 * - idle:      zero jobs, almost no history — nothing to act on.
 * - healthy:   producing at norm.
 * - unknown:   no ledger data yet (R2 unreadable or no runs since deploy).
 */
export function classifySite(row: SiteRow): SiteVerdict {
  if (row.fetch === null) return 'unknown';
  if (row.fetch === 'error') return 'dead';
  if (row.jobs7d === 0) {
    return row.totalJobs >= 10 ? 'quiet' : 'idle';
  }
  if (row.jobsPrior7d >= 5 && row.jobs7d < row.jobsPrior7d / 2) {
    return 'declining';
  }
  return 'healthy';
}

/**
 * Site attention: dead first (a dead top-yielder is the emergency), then
 * declining, then quiet — each yield-weighted so good links dying surface
 * before dead zero-yielders.
 */
export function siteAttentionList(rows: SiteRow[]): SiteRow[] {
  const rank: Record<SiteVerdict, number> = { dead: 0, declining: 1, quiet: 2, idle: 3, healthy: 4, unknown: 5 };
  return rows
    .filter((r) => {
      const v = classifySite(r);
      return v === 'dead' || v === 'declining' || v === 'quiet';
    })
    .sort((a, b) => rank[classifySite(a)] - rank[classifySite(b)] || b.totalJobs - a.totalJobs);
}
