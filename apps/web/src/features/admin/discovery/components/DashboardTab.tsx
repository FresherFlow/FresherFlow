'use client';

import { useMemo } from 'react';
import {
  ArrowRightIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  CircleStackIcon,
  CpuChipIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils/utils';
import { formatDistanceToNow } from 'date-fns';
import { DiscoveryRun, TelemetryStats } from '../types';
import { EmptyState } from '@/ui/EmptyState';

type IngestionTarget = { company: string; ats: string; slug: string };

interface DashboardTabProps {
  engineStatus: 'online' | 'offline' | 'loading';
  enginePlugins: number;
  stats: TelemetryStats | null | any;
  allTargets: IngestionTarget[];
  recentRuns: DiscoveryRun[];
  onRunAll: () => void;
  onNavigateTab: (tab: string) => void;
}

const compact = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

interface StatCardProps {
  label: string;
  value: number;
  accent: string;
  sub: React.ReactNode;
  onClick?: () => void;
  icon: React.ReactNode;
}

function StatCard({ label, value, accent, sub, onClick, icon }: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'text-left rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors',
        onClick && 'hover:border-border cursor-pointer'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/60">{icon}</span>
      </div>
      <div
        className={cn(
          'mt-2 text-3xl font-semibold tabular-nums tracking-tight',
          accent
        )}
        title={value.toLocaleString()}
      >
        {compact.format(value)}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </button>
  );
}

export function DashboardTab({
  engineStatus,
  enginePlugins,
  stats,
  allTargets,
  recentRuns,
  onRunAll,
  onNavigateTab,
}: DashboardTabProps) {
  const totalDiscovered = Number(stats?.totalJobsIngested ?? stats?.totalDiscovered ?? 0);
  const totalSaved = Number(stats?.totalJobsSaved ?? 0);
  const totalSkipped = Number(stats?.totalJobsSkipped ?? 0);
  const totalRuns = Number(stats?.totalRuns ?? 0);
  const totalTargets = Number(stats?.totalTargets ?? allTargets.length ?? 0);
  const uptimeSeconds = Number(stats?.uptimeSeconds ?? 0);
  const lastRunAt = stats?.lastRunAt ?? stats?.lastRun?.startedAt ?? stats?.lastRun?.started_at;

  const processedTotal = totalSaved + totalSkipped;
  const savedShare = processedTotal > 0 ? (totalSaved / processedTotal) * 100 : 50;
  const skippedShare = 100 - savedShare;
  const acceptRate = processedTotal > 0 ? savedShare.toFixed(1) : null;

  const uptimeLabel = useMemo(() => {
    if (!uptimeSeconds || uptimeSeconds <= 0) return '—';
    const h = Math.floor(uptimeSeconds / 3600);
    const m = Math.floor((uptimeSeconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }, [uptimeSeconds]);

  const lastRunLabel = lastRunAt
    ? formatDistanceToNow(new Date(lastRunAt), { addSuffix: true })
    : '—';

  const statusMeta = {
    online: { dot: 'bg-emerald-500 animate-pulse', text: 'text-emerald-600 dark:text-emerald-400', label: 'Live' },
    loading: { dot: 'bg-amber-500 animate-ping', text: 'text-amber-600 dark:text-amber-400', label: 'Connecting…' },
    offline: { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', label: 'Offline' },
  }[engineStatus];

  return (
    <div className="space-y-4">
      {/* Engine strip — one line: identity, live meta, actions */}
      <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xs flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-muted/50 border border-border/40 flex items-center justify-center shrink-0">
            <CpuChipIcon className="w-5 h-5 text-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Discovery Engine</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                <span className={cn('w-1.5 h-1.5 rounded-full', statusMeta.dot)} />
                <span className={statusMeta.text}>{statusMeta.label}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {enginePlugins} plugins · {totalTargets} targets · up {uptimeLabel} · last run {lastRunLabel}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('discovered')}
            className="h-8 px-3 rounded-lg border border-border text-foreground hover:bg-muted/50 text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            Review queue
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRunAll}
            className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
          >
            <PlayIcon className="w-3.5 h-3.5 fill-current" />
            Run crawlers
          </button>
        </div>
      </div>

      {/* KPI hero row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label="Discovered"
          value={totalDiscovered}
          accent="text-foreground"
          icon={<ChartBarIcon className="w-4 h-4" />}
          sub="raw jobs ingested"
          onClick={() => onNavigateTab('discovered')}
        />
        <StatCard
          label="Saved"
          value={totalSaved}
          accent="text-emerald-600 dark:text-emerald-400"
          icon={<CheckBadgeIcon className="w-4 h-4" />}
          sub={acceptRate ? `${acceptRate}% of processed kept` : 'normalized in database'}
          onClick={() => onNavigateTab('processed')}
        />
        <StatCard
          label="Skipped"
          value={totalSkipped}
          accent="text-amber-600 dark:text-amber-400"
          icon={<CircleStackIcon className="w-4 h-4" />}
          sub="duplicates & filtered out"
        />
        <StatCard
          label="Runs"
          value={totalRuns}
          accent="text-foreground"
          icon={<CircleStackIcon className="w-4 h-4" />}
          sub={`last run ${lastRunLabel}`}
          onClick={() => onNavigateTab('runs')}
        />
      </div>

      {/* Throughput — proportional visual of saved vs skipped */}
      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground">Pipeline throughput</span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {acceptRate ? `${acceptRate}% accept rate` : 'No processed jobs yet'}
          </span>
        </div>

        <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted/60">
          <div
            className="bg-emerald-500/80 transition-all duration-500"
            style={{ width: `${savedShare}%` }}
          />
          <div
            className="bg-amber-500/70 transition-all duration-500"
            style={{ width: `${skippedShare}%` }}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-emerald-500/80" />
            Saved <strong className="text-foreground tabular-nums">{totalSaved.toLocaleString()}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-amber-500/70" />
            Skipped <strong className="text-foreground tabular-nums">{totalSkipped.toLocaleString()}</strong>
          </span>
          <span className="ml-auto">
            Processed total <strong className="text-foreground tabular-nums">{processedTotal.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between px-0.5 mb-2">
          <span className="text-xs font-medium text-muted-foreground">Recent activity</span>
          <button
            onClick={() => onNavigateTab('runs')}
            className="text-xs text-primary hover:underline font-medium cursor-pointer"
          >
            View all runs
          </button>
        </div>

        <div className="rounded-xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40 shadow-xs">
          {recentRuns.length === 0 ? (
            <div className="m-4">
              <EmptyState
                title="No runs yet"
                description="Trigger a crawler run and activity will land here."
                icon="inbox"
                size="md"
                variant="ghost"
                action={
                  <button
                    onClick={onRunAll}
                    className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <PlayIcon className="w-3.5 h-3.5 fill-current" />
                    Run all crawlers now
                  </button>
                }
              />
            </div>
          ) : (
            recentRuns.map((activity) => {
              const status = activity.status;
              const found = activity.totalFound ?? activity.total_found ?? 0;
              const accepted = activity.accepted ?? 0;
              const durationMs = activity.durationMs ?? activity.duration_ms ?? 0;
              const startedAt = activity.startedAt || activity.started_at;

              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => onNavigateTab('runs')}
                  className="w-full text-left px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        status === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : status === 'RUNNING'
                            ? 'bg-blue-500 animate-pulse'
                            : 'bg-rose-500'
                      )}
                    />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground">
                        {status === 'COMPLETED' ? 'Completed' : status === 'RUNNING' ? 'Running' : 'Failed'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {startedAt ? formatDistanceToNow(new Date(startedAt), { addSuffix: true }) : 'just now'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0 tabular-nums">
                    <span className="text-muted-foreground">
                      <strong className="text-foreground font-semibold">{found.toLocaleString()}</strong> found
                    </span>
                    <span className="text-muted-foreground">
                      <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {accepted.toLocaleString()}
                      </strong>{' '}
                      saved
                    </span>
                    <span className="text-muted-foreground w-12 text-right">
                      {durationMs ? `${(durationMs / 1000).toFixed(1)}s` : '—'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
