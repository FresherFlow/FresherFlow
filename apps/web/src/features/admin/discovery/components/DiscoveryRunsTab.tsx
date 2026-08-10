'use client';

import { PlayIcon, ServerIcon, ClockIcon } from '@heroicons/react/24/outline';
import { DiscoveryRun } from '../types';
import { cn } from '@repo/ui/utils/cn';

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
        <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md shadow-xs">
                <tr className="border-b border-border/60 text-xs font-semibold text-muted-foreground tracking-wide">
                  <th className="py-3 px-4">Run ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Started At</th>
                  <th className="py-3 px-4 text-right">Duration</th>
                  <th className="py-3 px-4 text-right">Total Found</th>
                  <th className="py-3 px-4 text-right">Accepted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {runs.map(run => (
                  <tr key={run.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-foreground truncate max-w-[140px]">{run.id}</td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-bold border',
                          run.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-foreground border-emerald-500/20'
                            : run.status === 'RUNNING'
                            ? 'bg-blue-500/10 text-foreground border-blue-500/20'
                            : 'bg-red-500/10 text-foreground border-red-500/20'
                        )}
                      >
                        {run.status.charAt(0).toUpperCase() + run.status.slice(1).toLowerCase().replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {new Date(run.startedAt || (run as any).started_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                      {run.durationMs || (run as any).duration_ms ? `${(((run.durationMs || (run as any).duration_ms) || 0) / 1000).toFixed(1)}s` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                      {run.totalFound || (run as any).total_found || 0}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-foreground">
                      {run.accepted || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
