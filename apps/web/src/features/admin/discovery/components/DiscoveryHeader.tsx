'use client';

import { ChevronDownIcon, RocketLaunchIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@repo/ui/utils/cn';
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import { useTheme } from '@/lib/providers/ThemeContext';
import { TelemetryStats } from '../types';

interface DiscoveryHeaderProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  engineOnline: boolean | null;
  enginePluginCount: number;
  stats: TelemetryStats;
  isRunningAll: boolean;
  isConfirming?: boolean;
  onRunAll: () => void;
  onRefreshHealth: () => void;
  onOpenAddModal: () => void;
  isStandalone?: boolean;
}

export function DiscoveryHeader({
  isCollapsed,
  setIsCollapsed,
  engineOnline,
  enginePluginCount,
  stats,
  isRunningAll,
  isConfirming,
  onRunAll,
  onRefreshHealth,
  isStandalone,
}: DiscoveryHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  if (isCollapsed) {
    return (
      <div className="border-b border-border/70 bg-card/60 px-4 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={cn('w-1.5 h-1.5 rounded-full', engineOnline ? 'bg-emerald-500' : 'bg-rose-500')} />
          <span className="font-mono text-muted-foreground">
            {engineOnline ? `Live · ${enginePluginCount} Plugins` : 'Offline'}
          </span>
          <span className="text-border/60">·</span>
          <span className="text-muted-foreground">
            Saved: <strong className="text-foreground">{(stats.totalJobsSaved ?? 0).toLocaleString()}</strong>
          </span>
        </div>
        <button onClick={() => setIsCollapsed(false)} className="text-muted-foreground hover:text-foreground cursor-pointer p-1">
          <ChevronDownIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-border/70 bg-card/60 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 transition-colors relative">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
        <div>
          <h1 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Discovery Engine</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-normal line-clamp-1">
            Job Discovery & Ingestion Pipeline
          </p>
        </div>

        {/* Engine Status Pill */}
        <div className="flex items-center gap-2 sm:border-l sm:border-border/60 sm:pl-3 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-muted/50 text-muted-foreground border border-border/40">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                engineOnline === true ? 'bg-emerald-500' : 'bg-rose-500'
              )}
            />
            {engineOnline === true
              ? `Engine Live${enginePluginCount ? ` (${enginePluginCount} Plugins)` : ''}`
              : engineOnline === false
              ? 'Engine Offline'
              : 'Checking Engine...'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between xl:justify-end gap-3 flex-wrap sm:flex-nowrap">
        {/* Telemetry Stats Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-[11px] font-mono shrink-0">
            <span className="text-muted-foreground">Ingested: </span>
            <span className="text-foreground font-bold">{(stats.totalJobsIngested ?? 0).toLocaleString()}</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-[11px] font-mono shrink-0">
            <span className="text-muted-foreground">Saved: </span>
            <span className="text-foreground font-bold">{(stats.totalJobsSaved ?? 0).toLocaleString()}</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-[11px] font-mono shrink-0">
            <span className="text-muted-foreground">Skipped: </span>
            <span className="text-foreground font-bold">{(stats.totalJobsSkipped ?? 0).toLocaleString()}</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-[11px] font-mono shrink-0">
            <span className="text-muted-foreground">Runs: </span>
            <span className="text-foreground font-bold">{(stats.totalRuns ?? 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onRunAll}
            disabled={isRunningAll}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-semibold transition-colors duration-150 ease-out shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50',
              isConfirming
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            <RocketLaunchIcon className={cn('w-3.5 h-3.5', isRunningAll && 'animate-spin')} />
            <span>{isConfirming ? 'Confirm Run All?' : 'Run All Crawlers'}</span>
          </button>

          <button
            onClick={onRefreshHealth}
            title="Check Engine Health"
            className="h-8 w-8 rounded-lg border border-border/80 bg-card hover:bg-muted text-muted-foreground hover:text-foreground active:scale-[0.96] flex items-center justify-center transition-colors duration-150 ease-out cursor-pointer"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
          </button>

          {isStandalone && (
            <ThemeToggle theme={theme as any} toggleTheme={toggleTheme} />
          )}

          <button
            onClick={() => setIsCollapsed(true)}
            title="Collapse Header"
            className="h-8 w-8 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground active:scale-[0.96] flex items-center justify-center transition-colors duration-150 ease-out cursor-pointer"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
