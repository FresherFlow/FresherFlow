'use client';

import { PlayIcon, ServerIcon, ClockIcon } from '@heroicons/react/24/outline';
import { DiscoveryRun } from '../types';
import { cn } from '@repo/ui/utils/cn';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';

interface DiscoveryRunsTabProps {
  runs: DiscoveryRun[];
  onTriggerRun: () => void;
}

export function DiscoveryRunsTab({ runs, onTriggerRun }: DiscoveryRunsTabProps) {
  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <ServerIcon className="w-4 h-4 text-primary" />
            Discovery run history
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor and trigger pipeline execution runs
          </p>
        </div>

        <button
          onClick={onTriggerRun}
          className="h-8 px-4 rounded-lg bg-muted/40 border border-border/80 text-foreground hover:bg-muted text-xs font-medium transition-all duration-150 active:scale-[0.96] shadow-xs flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
        >
          <PlayIcon className="w-3.5 h-3.5 fill-current" />
          <span>Trigger New Run</span>
        </button>
      </div>

      {runs.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-border/60 rounded-xl flex flex-col items-center gap-2 text-muted-foreground text-xs">
          <ServerIcon className="w-6 h-6 opacity-50" />
          No discovery runs yet. Trigger a run to start.
        </div>
      ) : (
        <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden shadow-xs border-border/40">
          <div className="overflow-x-auto">
            <Table className="w-full text-left border-collapse">
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md shadow-xs">
                <TableRow className="border-b border-border/60 text-xs font-semibold text-muted-foreground tracking-wide">
                  <TableHead className="py-3 px-4 font-medium text-xs text-muted-foreground">Run ID</TableHead>
                  <TableHead className="py-3 px-4 font-medium text-xs text-muted-foreground">Status</TableHead>
                  <TableHead className="py-3 px-4 font-medium text-xs text-muted-foreground">Started At</TableHead>
                  <TableHead className="py-3 px-4 text-right font-medium text-xs text-muted-foreground">Duration</TableHead>
                  <TableHead className="py-3 px-4 text-right font-medium text-xs text-muted-foreground">Total Found</TableHead>
                  <TableHead className="py-3 px-4 text-right font-medium text-xs text-muted-foreground">Accepted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/40">
                {runs.map(run => (
                  <TableRow key={run.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3 px-4 text-sm font-medium text-foreground truncate max-w-[140px]">{run.id}</TableCell>
                    <TableCell className="py-3 px-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-bold border',
                          run.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : run.status === 'RUNNING'
                            ? 'bg-muted text-muted-foreground border-border/40'
                            : 'bg-destructive/10 text-destructive border-destructive/20'
                        )}
                      >
                        {run.status.charAt(0).toUpperCase() + run.status.slice(1).toLowerCase().replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                      {new Date(run.startedAt || (run as any).started_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right text-xs text-muted-foreground">
                      {run.durationMs || (run as any).duration_ms ? `${(((run.durationMs || (run as any).duration_ms) || 0) / 1000).toFixed(1)}s` : '-'}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right text-xs text-muted-foreground">
                      {run.totalFound || (run as any).total_found || 0}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right text-xs text-foreground">
                      {run.accepted || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
