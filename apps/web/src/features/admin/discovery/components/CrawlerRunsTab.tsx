'use client';

import { CpuChipIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { RunLog, RunResult } from '../types';

interface CrawlerRunsTabProps {
  logs: RunLog[];
  onInspectJobs: (result: RunResult) => void;
}

export function CrawlerRunsTab({ logs, onInspectJobs }: CrawlerRunsTabProps) {
  return (
    <div className="space-y-4 max-w-5xl">
      <div className="border-b border-border/60 pb-2.5 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          LIVE SESSION CRAWLER EXECUTION LOGS
        </span>
        <span className="text-xs text-muted-foreground font-mono">{logs.length} execution records</span>
      </div>

      {logs.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border/80 rounded-2xl bg-card/40 backdrop-blur-xs">
          <CpuChipIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-60" />
          <p className="text-sm font-bold text-foreground">No execution logs in session</p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Click &quot;Run Crawler&quot;, &quot;Run Board Scraper&quot;, or &quot;Run All Crawlers&quot; to record live execution trace.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((r, i) => (
            <div
              key={`${r.key}-${r.startedAt}-${i}`}
              className="p-3.5 rounded-xl border border-border/60 bg-card/60 backdrop-blur-xs flex items-center justify-between text-xs font-mono"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-foreground truncate">
                    {r.company} {r.isDryRun && '(DRY RUN)'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(r.startedAt).toLocaleTimeString()} •{' '}
                    {r.result.durationMs ? `${(r.result.durationMs / 1000).toFixed(1)}s` : 'active'} • ATS:{' '}
                    {r.ats}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="bg-muted/50 text-muted-foreground font-mono text-[10px] border border-border/40 px-2 py-0.5 rounded">
                  {r.result.saved} saved • {r.result.skipped} skipped
                </span>

                {r.result.jobs && r.result.jobs.length > 0 && (
                  <button
                    onClick={() => onInspectJobs(r.result)}
                    className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Jobs ({r.result.jobs.length})</span>
                    <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                  </button>
                )}

                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground border border-border/60">
                  {r.result.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
