'use client';

import { useState, useEffect } from 'react';
import { PlayIcon, ServerIcon, ClockIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { DiscoveryRun } from '../types';
import { cn } from '@/lib/utils/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';
import { PaginationControls } from '@/ui/data-table/DataTablePagination';

interface DiscoveryRunsTabProps {
 runs: DiscoveryRun[];
 onTriggerRun: () => void;
}

export function DiscoveryRunsTab({ runs, onTriggerRun }: DiscoveryRunsTabProps) {
 const [search, setSearch] = useState('');
 const [pageIndex, setPageIndex] = useState(0);
 const [pageSize, setPageSize] = useState(20);

 const filteredRuns = runs.filter(run => {
 const searchLower = search.toLowerCase().trim();
 if (!searchLower) return true;
 return (
 run.id.toLowerCase().includes(searchLower) ||
 run.status.toLowerCase().includes(searchLower)
 );
 });

 useEffect(() => {
   setPageIndex(0);
 }, [search]);

 const paginatedRuns = filteredRuns.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

 return (
 <div className="flex flex-col h-full space-y-2 sm:space-y-4 min-h-0">
 {/* Top Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 border-b-0 sm:border-b border-border/60 pb-0 sm:pb-3">
 <div className="hidden md:flex items-center gap-3">
 <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
 <ServerIcon className="w-5 h-5" />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h2 className="text-base font-bold text-foreground">Discovery Run History</h2>
 <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
 {runs.length} runs
 </span>
 </div>
 <p className="hidden md:block text-xs text-muted-foreground mt-0.5">
 Monitor execution cycles, metrics and scraper performance logs
 </p>
 </div>
 </div>

 <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
 <div className="relative w-full sm:w-64">
 <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
 <input
 type="text"
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="Search run ID or status..."
 className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border/80 bg-card text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
 />
 </div>

 <button
 onClick={onTriggerRun}
 className="h-8 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-all duration-150 active:scale-[0.96] shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
 >
 <PlayIcon className="w-3.5 h-3.5 fill-current" />
 <span>Trigger New Run</span>
 </button>
 </div>
 </div>

 {runs.length === 0 ? (
 <div className="p-12 text-center border-2 border-dashed border-border/60 rounded-xl flex flex-col items-center gap-2 text-muted-foreground text-xs">
 <ServerIcon className="w-8 h-8 opacity-50 text-muted-foreground" />
 <p className="font-semibold text-foreground text-sm">No discovery runs found</p>
 <p className="text-muted-foreground">Trigger a run to start scraping target sources.</p>
 </div>
 ) : (
 <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden shadow-xs flex flex-col flex-1 min-h-0">
 <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
 <Table className="w-full text-left border-collapse">
 <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md shadow-xs">
 <TableRow className="border-b border-border/60 text-xs font-semibold tracking-wider text-muted-foreground">
 <TableHead className="py-3 px-4 font-medium">Run ID</TableHead>
 <TableHead className="py-3 px-4 font-medium">Status</TableHead>
 <TableHead className="py-3 px-4 font-medium">Started At</TableHead>
 <TableHead className="py-3 px-4 font-medium">Completed At</TableHead>
 <TableHead className="py-3 px-4 text-right font-medium">Duration</TableHead>
 <TableHead className="py-3 px-4 text-right font-medium">Total Found</TableHead>
 <TableHead className="py-3 px-4 text-right font-medium">Accepted</TableHead>
 <TableHead className="py-3 px-4 text-right font-medium">Review Req.</TableHead>
 <TableHead className="py-3 px-4 text-right font-medium">Duplicates</TableHead>
 <TableHead className="py-3 px-4 text-right font-medium">Failed</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="divide-y divide-border/40 text-xs">
 {paginatedRuns.map(run => {
 const startedAtStr = run.startedAt || run.started_at;
 const completedAtStr = run.completedAt || run.completed_at;
 const durationMs = run.durationMs ?? run.duration_ms;
 const totalFound = run.totalFound ?? run.total_found ?? 0;
 const accepted = run.accepted ?? 0;
 const reviewRequired = run.reviewRequired ?? run.review_required ?? 0;
 const duplicates = run.duplicates ?? 0;
 const failed = run.failed ?? 0;

 const formattedStarted = startedAtStr ? new Date(startedAtStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' }) : '-';
 const formattedCompleted = completedAtStr ? new Date(completedAtStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';

 return (
 <TableRow key={run.id} className="hover:bg-muted/30 transition-colors">
 {/* Run ID */}
 <TableCell className="py-3 px-4 font-bold text-foreground truncate max-w-[140px]" title={run.id}>
 {run.id}
 </TableCell>

 {/* Status */}
 <TableCell className="py-3 px-4">
 <span
 className={cn(
 'px-2 py-0.5 rounded text-[11px] font-bold border inline-block',
 run.status === 'COMPLETED'
 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
 : run.status === 'RUNNING'
 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 animate-pulse'
 : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
 )}
 >
 {run.status.charAt(0).toUpperCase() + run.status.slice(1).toLowerCase().replace(/_/g, ' ')}
 </span>
 </TableCell>

 {/* Started At */}
 <TableCell className="py-3 px-4 text-muted-foreground">
 {formattedStarted}
 </TableCell>

 {/* Completed At */}
 <TableCell className="py-3 px-4 text-muted-foreground">
 {formattedCompleted}
 </TableCell>

 {/* Duration */}
 <TableCell className="py-3 px-4 text-right text-muted-foreground">
 {durationMs ? `${(durationMs / 1000).toFixed(1)}s` : '-'}
 </TableCell>

 {/* Total Found */}
 <TableCell className="py-3 px-4 text-right font-semibold text-foreground">
 {totalFound}
 </TableCell>

 {/* Accepted */}
 <TableCell className="py-3 px-4 text-right">
 <span className="text-emerald-600 dark:text-emerald-400 font-bold">{accepted}</span>
 </TableCell>

 {/* Review Required */}
 <TableCell className="py-3 px-4 text-right">
 <span className={reviewRequired > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-muted-foreground'}>
 {reviewRequired}
 </span>
 </TableCell>

 {/* Duplicates */}
 <TableCell className="py-3 px-4 text-right text-muted-foreground">
 {duplicates}
 </TableCell>

 {/* Failed */}
 <TableCell className="py-3 px-4 text-right">
 <span className={failed > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-muted-foreground'}>
 {failed}
 </span>
 </TableCell>
 </TableRow>
 );
 })}

 {filteredRuns.length === 0 && (
 <TableRow>
 <TableCell colSpan={10} className="p-8 text-center text-muted-foreground text-xs">
 No matching run logs found.
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 {filteredRuns.length > 0 && (
   <PaginationControls
     pageIndex={pageIndex}
     pageSize={pageSize}
     pageCount={Math.ceil(filteredRuns.length / pageSize)}
     totalRows={filteredRuns.length}
     canPreviousPage={pageIndex > 0}
     canNextPage={pageIndex < Math.ceil(filteredRuns.length / pageSize) - 1}
     setPageIndex={setPageIndex}
     setPageSize={setPageSize}
     previousPage={() => setPageIndex(p => Math.max(0, p - 1))}
     nextPage={() => setPageIndex(p => p + 1)}
   />
 )}
 </div>
 )}
 </div>
 );
}
