'use client';

import { ChevronDownIcon, RocketLaunchIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/ui/DropdownMenu';
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
  isRunningAllBoards?: boolean;
  isConfirming?: boolean;
  onRunAllCompanies: () => void;
  onRunAllBoards: () => void;
  onRefreshHealth: () => void;
  onOpenAddModal: () => void;
  onRunDorker?: () => void;
  isStandalone?: boolean;
  autoRefresh?: boolean;
  setAutoRefresh?: (val: boolean) => void;
  lastRunTime?: string;
  hoursOld?: number;
  setHoursOld?: (hours: number) => void;
}

export function DiscoveryHeader({
  isCollapsed,
  setIsCollapsed,
  engineOnline,
  enginePluginCount,
  stats,
  isRunningAll,
  isRunningAllBoards,
  isConfirming,
  onRunAllCompanies,
  onRunAllBoards,
  onRefreshHealth,
  onRunDorker,
  isStandalone,
  autoRefresh = false,
  setAutoRefresh,
  lastRunTime,
  hoursOld,
  setHoursOld,
}: DiscoveryHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  if (isCollapsed) {
    return (
      <div className="border-b border-border/70 px-4 py-1.5 flex items-center justify-between text-xs bg-background shrink-0">
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
    <div className="border-b border-border/70 px-4 py-2 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs bg-background shrink-0">
      <div className="flex items-center gap-3 min-w-0 flex-wrap sm:flex-nowrap">
        {/* Engine Status Pill */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-muted/50 text-muted-foreground border border-border/40 shrink-0">
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

        {/* Telemetry Stats Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
          <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-xs font-mono shrink-0">
            <span className="text-muted-foreground">Ingested: </span>
            <span className="text-foreground font-bold">{(stats.totalJobsIngested ?? 0).toLocaleString()}</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-xs font-mono shrink-0">
            <span className="text-muted-foreground">Saved: </span>
            <span className="text-foreground font-bold">{(stats.totalJobsSaved ?? 0).toLocaleString()}</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-xs font-mono shrink-0">
            <span className="text-muted-foreground">Skipped: </span>
            <span className="text-foreground font-bold">{(stats.totalJobsSkipped ?? 0).toLocaleString()}</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-xs font-mono shrink-0">
            <span className="text-muted-foreground">Runs: </span>
            <span className="text-foreground font-bold">{(stats.totalRuns ?? 0).toLocaleString()}</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-xs font-mono shrink-0">
            <span className="text-muted-foreground">Uptime: </span>
            <span className="text-foreground font-bold">
              {stats.uptimeSeconds ? `${Math.floor(stats.uptimeSeconds / 3600)}h ${Math.floor((stats.uptimeSeconds % 3600) / 60)}m` : '0h 0m'}
            </span>
          </div>
          {lastRunTime && (
            <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-xs font-mono shrink-0">
              <span className="text-muted-foreground">Last Run: </span>
              <span className="text-foreground font-bold">
                {new Date(lastRunTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer mr-1 border border-border/60 px-2 py-1 rounded-lg bg-background hover:bg-muted transition-colors">
          <input 
            type="checkbox" 
            checked={autoRefresh} 
            onChange={e => setAutoRefresh?.(e.target.checked)} 
            className="rounded bg-muted border-border/80 text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
          />
          Auto-refresh
        </label>

        {hoursOld !== undefined && setHoursOld && (
          <select
            value={hoursOld}
            onChange={(e) => setHoursOld(Number(e.target.value))}
            className="h-7 px-2 rounded-lg bg-background border border-border/80 text-foreground text-xs focus:ring-1 focus:ring-primary outline-none cursor-pointer"
          >
            <option value={24}>1 Day (24h)</option>
            <option value={72}>3 Days (72h)</option>
            <option value={168}>7 Days (168h)</option>
            <option value={336}>14 Days (336h)</option>
            <option value={720}>30 Days (720h)</option>
          </select>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={isRunningAll || isRunningAllBoards}
              className={cn(
                'h-7 px-3 rounded-lg text-xs font-medium transition-all duration-150 ease-out flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.96] shadow-xs',
                isConfirming
                  ? 'bg-amber-500 text-white hover:bg-amber-600 border-transparent'
                  : 'bg-muted/40 border border-border/80 text-foreground hover:bg-muted'
              )}
            >
              <RocketLaunchIcon className={cn('w-3.5 h-3.5', (isRunningAll || isRunningAllBoards) && 'animate-spin')} />
              <span>{isConfirming ? 'Confirm Run All?' : 'Run Crawlers'}</span>
              <ChevronDownIcon className="w-3.5 h-3.5 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 text-xs bg-background">
            <DropdownMenuItem onClick={onRunAllCompanies}>
              Run All Target Companies (ATS)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRunAllBoards}>
              Run All Job Boards
            </DropdownMenuItem>
            {onRunDorker && (
              <DropdownMenuItem onClick={onRunDorker}>
                Run Dorker
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={onRefreshHealth}
          title="Check Engine Health"
          className="h-7 w-7 rounded-lg border border-border/80 bg-background hover:bg-muted text-muted-foreground hover:text-foreground active:scale-[0.96] flex items-center justify-center transition-colors duration-150 ease-out cursor-pointer"
        >
          <ArrowPathIcon className="w-3.5 h-3.5" />
        </button>

        {isStandalone && (
          <ThemeToggle theme={theme as any} toggleTheme={toggleTheme} />
        )}

        <button
          onClick={() => setIsCollapsed(true)}
          title="Collapse Header"
          className="h-7 w-7 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground active:scale-[0.96] flex items-center justify-center transition-colors duration-150 ease-out cursor-pointer"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
