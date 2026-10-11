'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Briefcase,
  ChevronDown,
  Globe,
  Link2,
  Radio,
  RefreshCw,
  Search,
  TriangleAlert,
} from 'lucide-react';
import { cn } from '@/ui/cn';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { Input } from '@/ui/Input';
import { NativeSelect } from '@/ui/NativeSelect';
import { Skeleton } from '@/ui/Skeleton';
import { StatCard } from '@/ui/StatCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/Table';
import { Hint } from '@/ui/Tooltip';
import { adminApi } from '@/lib/api/admin';
import type { SourcesPayload, SiteVerdict } from './types';
import { classifySite, siteAttentionList } from './classify';

const DAY_OPTIONS = [7, 14, 30, 60];

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

const SITE_VERDICT_BADGE: Record<SiteVerdict, { variant: 'success' | 'warning' | 'destructive' | 'muted'; label: string }> = {
  dead: { variant: 'destructive', label: 'Fetch failing' },
  declining: { variant: 'warning', label: 'Declining' },
  quiet: { variant: 'warning', label: 'Gone quiet' },
  idle: { variant: 'muted', label: 'Idle' },
  healthy: { variant: 'success', label: 'Healthy' },
  unknown: { variant: 'muted', label: 'No data yet' },
};

function Sparkline({ points }: { points: Array<{ d: string; jobs: number }> }) {
  const last = points.slice(-14);
  const max = Math.max(1, ...last.map((p) => p.jobs));
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden="true">
      {last.map((p) => (
        <div
          key={p.d}
          title={`${p.d}: ${p.jobs} jobs`}
          className={cn('flex-1 rounded-sm', p.jobs > 0 ? 'bg-muted-foreground/50' : 'bg-muted')}
          style={{ height: p.jobs > 0 ? `${Math.max(12, Math.round((p.jobs / max) * 100))}%` : '12%' }}
        />
      ))}
    </div>
  );
}

function Delta({ current, prior }: { current: number; prior: number }) {
  if (prior <= 0) {
    return current > 0 ? <span className="ml-1.5 text-xs text-muted-foreground">new</span> : null;
  }
  const pct = Math.round(((current - prior) / prior) * 100);
  return (
    <span className={cn('ml-1.5 text-xs tabular-nums', pct < 0 ? 'text-destructive' : 'text-success')}>
      {pct < 0 ? '▼' : '▲'}{Math.abs(pct)}%
    </span>
  );
}

export function SourcesWorkspace() {
  const [days, setDays] = useState(30);
  const [payload, setPayload] = useState<SourcesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | 'site' | 'channel'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getSourceHealth(d);
      setPayload(data);
    } catch {
      setError('Source stats did not load. Check the connection and retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  const siteRows = useMemo(() => {
    const list = payload?.siteHealth ?? [];
    const q = query.trim().toLowerCase();
    const filtered = list.filter(
      (r) =>
        (!q || r.name.toLowerCase().includes(q)) &&
        (kind === 'all' || r.kind === kind)
    );
    const rank: Record<SiteVerdict, number> = { dead: 0, declining: 1, quiet: 2, idle: 3, healthy: 4, unknown: 5 };
    return [...filtered].sort(
      (a, b) => rank[classifySite(a)] - rank[classifySite(b)] || b.jobs7d - a.jobs7d || b.totalJobs - a.totalJobs
    );
  }, [payload, query, kind]);

  const siteAttention = useMemo(() => siteAttentionList(payload?.siteHealth ?? []), [payload]);

  const censusUrls = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of payload?.census.sites ?? []) map.set(`site:${s.name}`, s.urls);
    return map;
  }, [payload]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const t = payload?.totals;

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Source Health</h1>
          <p className="text-meta text-muted-foreground">
            {payload
              ? `${payload.census.sites.length} sites · ${payload.census.channels.length} channels · updated ${timeAgo(payload.generatedAt)}`
              : 'What each site and channel gave, what is live, what is dying.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NativeSelect
            variant="compact"
            aria-label="Range"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                Last {d} days
              </option>
            ))}
          </NativeSelect>
          <Hint label="Refresh">
            <Button variant="outline" size="iconSm" aria-label="Refresh" disabled={loading} onClick={() => void load(days)}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </Hint>
        </div>
      </div>

      {loading && !payload ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5" aria-busy="true" aria-label="Loading source stats">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="panel" className="h-[104px]" />
          ))}
          <Skeleton variant="surface" className="col-span-2 h-64 md:col-span-5" />
        </div>
      ) : null}

      {error && !payload ? (
        <ErrorMessage
          title="Source stats did not load"
          message={error}
          onRetry={() => void load(days)}
        />
      ) : null}

      {payload ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard label="Sites" value={t?.sites ?? 0} icon={Globe} />
            <StatCard label="Channels" value={t?.channels ?? 0} icon={Radio} />
            <StatCard label="Links seen · 7d" value={t?.links7d ?? 0} icon={Link2} />
            <StatCard label="Jobs · 7d" value={t?.jobs7d ?? 0} icon={Briefcase} />
            <StatCard label="Need a look" value={t?.troubled ?? 0} icon={Activity} caption="fetch failing" />
          </div>

          {!payload.ledgerAvailable ? (
            <div className="rounded-lg border border-border bg-card p-4 text-sm">
              <span className="font-semibold">Per-site numbers pending.</span>{' '}
              <span className="text-muted-foreground">
                The list below is live from config. Links and jobs per site appear once scheduled runs record to the
                R2 health ledger — history accrues from deploy and past runs cannot be backfilled.
              </span>
            </div>
          ) : null}

          {siteAttention.length > 0 ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TriangleAlert className="h-4 w-4 text-warning" />
                Needs a look
                <Badge variant="warning" size="sm">{siteAttention.length}</Badge>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {siteAttention.map((r) => {
                  const v = classifySite(r);
                  return (
                    <li key={r.id} className="flex flex-wrap items-center gap-x-2">
                      <span className="font-mono font-medium">{r.name}</span>
                      <Badge variant="muted" size="xs">{r.kind}</Badge>
                      <span className="text-muted-foreground">
                        {v === 'dead'
                          ? `fetch failing since ${r.lastRun ?? 'unknown'} after ${r.totalJobs} lifetime jobs — fix this first`
                          : v === 'declining'
                            ? `down to ${r.jobs7d} jobs/7d from ${r.jobsPrior7d}`
                            : `zero jobs in 7d after ${r.totalJobs} lifetime — check whether the site changed`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border p-3">
              <div className="flex w-full items-center gap-2">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  variant="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter sites and channels"
                  aria-label="Filter sites and channels"
                  className="border-0 bg-transparent px-0"
                />
              </div>
              <NativeSelect
                variant="compact"
                aria-label="Source type"
                value={kind}
                onChange={(e) => setKind(e.target.value as 'all' | 'site' | 'channel')}
                className="w-auto shrink-0"
              >
                <option value="all">All</option>
                <option value="site">Sites</option>
                <option value="channel">Channels</option>
              </NativeSelect>
            </div>
            {siteRows.length === 0 ? (
              <EmptyState
                size="md"
                variant="ghost"
                title={query || kind !== 'all' ? 'No matching sources' : 'No sites or channels configured'}
                description={query || kind !== 'all' ? 'Try a different filter.' : 'Check the aggregators config on the CDN.'}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>14d</TableHead>
                      <TableHead className="text-right">Links 7d</TableHead>
                      <TableHead className="text-right">Jobs 7d</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Last run</TableHead>
                      <TableHead className="text-right">Fetch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siteRows.map((r) => {
                      const verdict = classifySite(r);
                      const badge = SITE_VERDICT_BADGE[verdict];
                      const isOpen = expanded.has(r.id);
                      const urls = censusUrls.get(r.id) ?? [];
                      return (
                        <Fragment key={r.id}>
                          <TableRow
                            onClick={() => toggle(r.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                toggle(r.id);
                              }
                            }}
                            tabIndex={0}
                            aria-expanded={isOpen}
                            className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                          >
                            <TableCell>
                              <span className="flex items-center gap-2">
                                <span className="font-mono font-medium">{r.name}</span>
                                <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                                <ChevronDown
                                  className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                                />
                              </span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-micro text-muted-foreground">
                                <Badge variant="muted" size="xs">{r.kind}</Badge>
                                {r.govtOnly ? <Badge variant="muted" size="xs">govt-only</Badge> : null}
                                {!r.configured ? <Badge variant="muted" size="xs">unlisted</Badge> : null}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Sparkline points={r.daily} />
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{r.links7d ?? '—'}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {r.jobs7d}
                              <Delta current={r.jobs7d} prior={r.jobsPrior7d} />
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{r.totalJobs}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{r.lastRun ?? '—'}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{r.fetch ?? '—'}</TableCell>
                          </TableRow>
                          {isOpen ? (
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableCell colSpan={7}>
                                <div className="text-micro font-medium uppercase tracking-wide text-muted-foreground">
                                  Daily jobs · last 14 days
                                </div>
                                <div className="mt-2 grid grid-cols-7 gap-1.5">
                                  {r.daily.slice(-14).map((p) => (
                                    <div key={p.d} className="rounded border border-border bg-card px-1.5 py-1 text-center">
                                      <div className="text-micro text-muted-foreground">{p.d.slice(5)}</div>
                                      <div className="text-sm font-semibold tabular-nums">{p.jobs}</div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Lifetime {r.totalLinks} links · {r.totalJobs} jobs
                                  {urls.length > 0 ? ` · ${urls.length} configured URL${urls.length === 1 ? '' : 's'}` : ''}
                                </div>
                                {urls.length > 0 ? (
                                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                                    {urls.slice(0, 5).map((u) => (
                                      <div key={u} className="truncate font-mono">{u}</div>
                                    ))}
                                    {urls.length > 5 ? <div>+{urls.length - 5} more</div> : null}
                                  </div>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
