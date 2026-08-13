'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, RocketLaunchIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/ui/DropdownMenu';
import { Button } from '@/ui/Button';
import { cn } from '@repo/ui/utils/cn';
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import { useTheme } from '@/lib/providers/ThemeContext';
import { TelemetryStats } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';

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
 title?: string;
}

export function DiscoveryHeader({
 title = "Discovery Engine",
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

 const [headerTarget, setHeaderTarget] = useState<Element | null>(null);

 useEffect(() => {
 setHeaderTarget(document.getElementById('top-header-portal-target'));
 }, []);

  const mobileContent = isStandalone ? (
    <div className="border-b border-border/70 px-4 py-2 sm:px-6 flex items-center justify-between gap-3 text-xs bg-background shrink-0 min-h-[48px]">
      <div className="flex items-center gap-3 min-w-0">
        <span className="hidden md:inline text-base font-semibold text-foreground shrink-0">{title}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <ThemeToggle theme={theme as any} toggleTheme={toggleTheme} />
      </div>
    </div>
  ) : null;

 const desktopHeaderContent = (
 <div className="hidden md:flex h-14 items-center justify-between gap-4 w-full animate-in fade-in duration-150">
 <div className="flex items-center gap-3 min-w-0">
 <span className="text-lg font-semibold text-foreground shrink-0">{title}</span>

 {/* Engine Status Pill */}
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted/50 text-muted-foreground border border-border/40 shrink-0">
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
 <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-xs shrink-0">
 <span className="text-muted-foreground">Ingested: </span>
 <span className="text-foreground font-bold">{(stats.totalJobsIngested ?? 0).toLocaleString()}</span>
 </div>
 <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-xs shrink-0">
 <span className="text-muted-foreground">Saved: </span>
 <span className="text-foreground font-bold">{(stats.totalJobsSaved ?? 0).toLocaleString()}</span>
 </div>
 <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-xs shrink-0">
 <span className="text-muted-foreground">Skipped: </span>
 <span className="text-foreground font-bold">{(stats.totalJobsSkipped ?? 0).toLocaleString()}</span>
 </div>
 <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-xs shrink-0">
 <span className="text-muted-foreground">Runs: </span>
 <span className="text-foreground font-bold">{(stats.totalRuns ?? 0).toLocaleString()}</span>
 </div>
 <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-xs shrink-0">
 <span className="text-muted-foreground">Uptime: </span>
 <span className="text-foreground font-bold">
 {stats.uptimeSeconds ? `${Math.floor(stats.uptimeSeconds / 3600)}h ${Math.floor((stats.uptimeSeconds % 3600) / 60)}m` : '0h 0m'}
 </span>
 </div>
 {lastRunTime && (
 <div className="px-2.5 py-1 rounded bg-muted/30 border border-border/40 text-xs shrink-0">
 <span className="text-muted-foreground">Last Run: </span>
 <span className="text-foreground font-bold">
 {new Date(lastRunTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 </div>
 )}
 </div>
 </div>

 <div className="flex items-center gap-1.5 shrink-0 ml-auto">
 <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer mr-1 border border-border/60 px-2 py-1 rounded-lg bg-background hover:bg-muted transition-colors">
 <input 
 type="checkbox" 
 checked={autoRefresh} 
 onChange={e => setAutoRefresh?.(e.target.checked)} 
 className="w-4 h-4 rounded border-border/80 bg-card text-primary focus:ring-1 focus:ring-primary focus:ring-offset-0 accent-primary cursor-pointer transition-colors"
 />
 Auto-refresh
 </label>

 {hoursOld !== undefined && setHoursOld && (
 <Select value={hoursOld.toString()} onValueChange={(val) => setHoursOld(Number(val))}>
 <SelectTrigger className="h-7 px-2 w-[110px] rounded-lg bg-background border border-border/80 text-foreground text-xs focus:outline-none focus-visible:bg-muted/60 focus-visible:text-foreground cursor-pointer">
 <SelectValue placeholder="Hours" />
 </SelectTrigger>
 <SelectContent className="min-w-[110px]">
 <SelectItem value="24">1 Day (24h)</SelectItem>
 <SelectItem value="72">3 Days (72h)</SelectItem>
 <SelectItem value="168">7 Days (168h)</SelectItem>
 <SelectItem value="336">14 Days (336h)</SelectItem>
 <SelectItem value="720">30 Days (720h)</SelectItem>
 </SelectContent>
 </Select>
 )}

 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button
 variant="admin"
 size="sm"
 disabled={isRunningAll || isRunningAllBoards}
 className="h-7"
 >
 <RocketLaunchIcon className={cn('w-3.5 h-3.5 mr-1.5', (isRunningAll || isRunningAllBoards) && 'animate-spin')} />
 {isConfirming ? 'Confirm run all?' : 'Run crawlers'}
 <ChevronDownIcon className="w-3.5 h-3.5 opacity-70 ml-1.5" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-56 text-xs">
 <DropdownMenuItem onClick={onRunAllCompanies}>
 Run all target companies (ATS)
 </DropdownMenuItem>
 <DropdownMenuItem onClick={onRunAllBoards}>
 Run all job boards
 </DropdownMenuItem>
 {onRunDorker && (
 <DropdownMenuItem onClick={onRunDorker}>
 Run dorker
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
 </div>
 </div>
 );

 return (
 <>
 <div className="md:hidden">
 {mobileContent}
 </div>
 {headerTarget && createPortal(desktopHeaderContent, headerTarget)}
 </>
 );
}

