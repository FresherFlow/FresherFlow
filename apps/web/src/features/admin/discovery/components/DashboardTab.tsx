'use client';

import {
  ChartBarIcon,
  CheckCircleIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  CpuChipIcon,
  ServerIcon,
  PlayIcon,
  ClockIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@repo/ui/utils/cn';
import { IngestionTarget, DiscoveryRun } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '@/ui/Card';

interface DashboardTabProps {
  engineStatus: 'online' | 'offline' | 'loading';
  enginePlugins: number;
  stats: any;
  allTargets: IngestionTarget[];
  recentRuns: DiscoveryRun[];
  onRunAll: () => void;
  onNavigateTab: (tab: string) => void;
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
  const totalDiscovered = stats?.totalJobsIngested ?? stats?.totalDiscovered ?? 0;
  const totalRuns = stats?.totalRuns ?? 0;
  const lastRunData = stats?.lastRun;
  
  const totalSaved = lastRunData?.accepted ?? 0;
  const totalSkipped = (lastRunData?.totalFound ?? lastRunData?.total_found ?? 0) - totalSaved;

  return (
    <div className="space-y-6">
      {/* Top Banner / Engine Status Bar */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl border border-border/80 bg-muted/40 flex items-center justify-center shrink-0">
            <CpuChipIcon className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-foreground">Ingestion Discovery Engine</h2>
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border',
                  engineStatus === 'online'
                    ? 'bg-emerald-500/10 text-foreground border-emerald-500/30'
                    : engineStatus === 'loading'
                    ? 'bg-amber-500/10 text-foreground border-amber-500/30'
                    : 'bg-red-500/10 text-foreground border-red-500/30'
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    engineStatus === 'online'
                      ? 'bg-emerald-500 animate-pulse'
                      : engineStatus === 'loading'
                      ? 'bg-amber-500 animate-ping'
                      : 'bg-red-500'
                  )}
                />
                {engineStatus === 'online'
                  ? 'Engine Online & Operational'
                  : engineStatus === 'loading'
                  ? 'Connecting to Engine...'
                  : 'Engine Offline'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Active Plugins: <span className="text-foreground font-semibold">{enginePlugins}</span> · Node Ingestion Service
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
          <button
            onClick={onRunAll}
            className="h-9 px-4 rounded-lg bg-muted/40 border border-border/80 text-foreground hover:bg-muted text-xs font-medium transition-all duration-150 active:scale-[0.96] shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <PlayIcon className="w-4 h-4 fill-current" />
            <span>Run All Crawlers Now</span>
          </button>
        </div>
      </div>

      {stats?.configured === false && (
        <div className="p-4 rounded-xl border border-red-500/50 bg-red-500/10 text-foreground flex items-center gap-2 text-sm font-medium">
          Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to environment variables.
        </div>
      )}

      {/* 4 Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1 */}
        <Card
          onClick={() => onNavigateTab('discovered')}
          className="hover:bg-muted/30 transition-all cursor-pointer shadow-xs group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold tracking-wider text-muted-foreground">Discovered</CardTitle>
            <ChartBarIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalDiscovered.toLocaleString()}</div>
            <span className="text-xs text-muted-foreground mt-1 block">Raw ingested jobs</span>
          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card
          onClick={() => onNavigateTab('processed')}
          className="hover:bg-muted/30 transition-all cursor-pointer shadow-xs group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold tracking-wider text-muted-foreground">Recently saved</CardTitle>
            <SparklesIcon className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 transition-opacity duration-300">{totalSaved.toLocaleString()}</div>
            <span className="text-xs text-muted-foreground mt-1 block">From latest run</span>
          </CardContent>
        </Card>

        {/* Card 3 */}
        <Card
          className="hover:bg-muted/30 transition-all cursor-pointer shadow-xs group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold tracking-wider text-muted-foreground">Recently skipped</CardTitle>
            <BuildingOfficeIcon className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground transition-opacity duration-300">{totalSkipped.toLocaleString()}</div>
            <span className="text-xs text-muted-foreground mt-1 block">From latest run</span>
          </CardContent>
        </Card>

        {/* Card 4 */}
        <Card
          onClick={() => onNavigateTab('runs')}
          className="hover:bg-muted/30 transition-all cursor-pointer shadow-xs group"
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold tracking-wider text-muted-foreground">Total runs</CardTitle>
            <ServerIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground transition-opacity duration-300">{totalRuns.toLocaleString()}</div>
            <span className="text-xs text-muted-foreground mt-1 block">Execution cycles</span>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: System Pipeline Health */}
      <div className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
          <span className="text-xs font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ServerIcon className="w-3.5 h-3.5" />
            Ingestion & Processing Pipeline Summary
          </span>
          <span className="text-xs font-mono text-muted-foreground">Automated Sync: Active</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-border/40 bg-card/40 flex flex-col">
            <span className="text-sm font-semibold text-muted-foreground">Phase 1: Scraping</span>
            <span className="text-sm font-bold text-foreground mt-1">{allTargets.length} Targets Active</span>
            <p className="text-xs text-muted-foreground mt-1">Greenhouse, Lever, Workday, Ashby + Boards</p>
          </div>
          <div className="p-3 rounded-xl border border-border/40 bg-card/40 flex flex-col">
            <span className="text-sm font-semibold text-muted-foreground">Phase 2: Deduplication</span>
            <span className="text-sm font-bold text-foreground mt-1">{totalSkipped} Skipped (Last Run)</span>
            <p className="text-xs text-muted-foreground mt-1">Exact URL & title fingerprint matching</p>
          </div>
          <div className="p-3 rounded-xl border border-border/40 bg-card/40 flex flex-col">
            <span className="text-sm font-semibold text-muted-foreground">Phase 3: AI Normalization</span>
            <span className="text-sm font-bold text-foreground mt-1">Fresher Scoring</span>
            <p className="text-xs text-muted-foreground mt-1">Extracts skills, salary, experience & eligibility</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
          <button
            onClick={() => onNavigateTab('discovered')}
            className="text-primary hover:underline font-medium cursor-pointer"
          >
            Explore discovered jobs queue →
          </button>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <span className="text-xs font-bold tracking-wider text-muted-foreground">
            Recent Scraper Activity Feed
          </span>
          <button
            onClick={() => onNavigateTab('runs')}
            className="text-xs text-primary hover:underline font-medium cursor-pointer"
          >
            View all logs →
          </button>
        </div>

        <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden divide-y divide-border/40 shadow-xs">
          {recentRuns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground font-mono text-xs border-2 border-dashed border-border/60 m-4 rounded-xl">
              No recent activity found. Trigger a run to see it here.
            </div>
          ) : (
            recentRuns.map((activity) => {
              const status = activity.status;
              const found = activity.totalFound ?? 0;
              const accepted = activity.accepted ?? 0;
              const durationMs = activity.durationMs ?? 0;
              const timeAgo = activity.startedAt ? new Date(activity.startedAt).toLocaleTimeString() : 'Just now';
              const id = activity.id;
              
              return (
                <div
                  key={id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        status === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : status === 'RUNNING'
                          ? 'bg-blue-500 animate-ping'
                          : 'bg-red-500'
                      )}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-foreground">Discovery Run</h4>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground block mt-0.5">
                        {id} · {timeAgo}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto font-mono text-xs">
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">{found ?? 0}</strong> found ·{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400">{accepted ?? 0}</strong> saved
                    </span>
                    <span className="text-muted-foreground">({(durationMs / 1000).toFixed(1)}s)</span>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-bold rounded border',
                        status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-foreground border-emerald-500/20'
                          : status === 'RUNNING'
                          ? 'bg-blue-500/10 text-foreground border-blue-500/20'
                          : 'bg-red-500/10 text-foreground border-red-500/20'
                      )}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
