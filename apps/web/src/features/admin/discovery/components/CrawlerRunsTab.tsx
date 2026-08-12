'use client';

import { useState, useEffect } from 'react';
import { CpuChipIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { RunLog, RunResult } from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';
import { PaginationControls } from '@/ui/data-table/DataTablePagination';

interface CrawlerRunsTabProps {
 logs: RunLog[];
 onInspectJobs: (result: RunResult) => void;
}

export function CrawlerRunsTab({ logs, onInspectJobs }: CrawlerRunsTabProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setPageIndex(0);
  }, [logs]);

  const paginatedLogs = logs.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="border-b border-border/60 pb-2.5 flex items-center justify-between">
 <span className="text-xs font-bold tracking-wider text-muted-foreground">
 Live session crawler execution logs
 </span>
 <span className="text-xs text-muted-foreground">{logs.length} execution records</span>
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
        <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden shadow-xs flex flex-col flex-1 min-h-0">
          <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
            <Table className="w-full text-left border-collapse">
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md shadow-xs">
                <TableRow className="border-b border-border/60 text-xs font-semibold tracking-wider text-muted-foreground">
                  <TableHead className="py-3 px-4 font-medium">Target / Company</TableHead>
                  <TableHead className="py-3 px-4 font-medium">Time</TableHead>
                  <TableHead className="py-3 px-4 font-medium">ATS</TableHead>
                  <TableHead className="py-3 px-4 font-medium">Duration</TableHead>
                  <TableHead className="py-3 px-4 text-center font-medium">Stats (Saved / Skipped)</TableHead>
                  <TableHead className="py-3 px-4 text-center font-medium">Status</TableHead>
                  <TableHead className="py-3 px-4 text-right font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/40 text-xs">
                {paginatedLogs.map((r, i) => (
                  <TableRow key={`${r.key}-${r.startedAt}-${i}`} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {r.company} {r.isDryRun && '(DRY RUN)'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground">
                      {new Date(r.startedAt).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground">
                      {r.ats}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground">
                      {r.result.durationMs ? `${(r.result.durationMs / 1000).toFixed(1)}s` : 'active'}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <span className="bg-muted/50 text-muted-foreground font-medium text-[11px] border border-border/40 px-2 py-0.5 rounded">
                        {r.result.saved} saved • {r.result.skipped} skipped
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border/60">
                        {r.result.status.charAt(0).toUpperCase() + r.result.status.slice(1).toLowerCase().replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      {r.result.jobs && r.result.jobs.length > 0 && (
                        <button
                          onClick={() => onInspectJobs(r.result)}
                          className="text-xs font-medium text-primary hover:underline flex items-center justify-end gap-1 cursor-pointer ml-auto"
                        >
                          <span>View Jobs ({r.result.jobs.length})</span>
                          <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls
            pageIndex={pageIndex}
            pageSize={pageSize}
            pageCount={Math.ceil(logs.length / pageSize)}
            totalRows={logs.length}
            canPreviousPage={pageIndex > 0}
            canNextPage={pageIndex < Math.ceil(logs.length / pageSize) - 1}
            setPageIndex={setPageIndex}
            setPageSize={setPageSize}
            previousPage={() => setPageIndex(p => Math.max(0, p - 1))}
            nextPage={() => setPageIndex(p => p + 1)}
          />
        </div>
      )}
    </div>
 );
}
