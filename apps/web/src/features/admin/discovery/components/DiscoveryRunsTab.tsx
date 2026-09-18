'use client';

import { useMemo } from 'react';
import { PlayIcon, ServerIcon } from '@heroicons/react/24/outline';
import { DiscoveryRun } from '../types';
import { cn } from '@/lib/utils/utils';
import { DataGrid, DataGridColumn } from '@/ui/data-grid/DataGrid';

interface DiscoveryRunsTabProps {
 runs: DiscoveryRun[];
 onTriggerRun: () => void;
}

export function DiscoveryRunsTab({ runs, onTriggerRun }: DiscoveryRunsTabProps) {
 const columns = useMemo<DataGridColumn<DiscoveryRun>[]>(() => {
  return [
   {
    id: 'runId',
    accessorFn: (row) => row.id,
    header: 'Run ID',
    enableSorting: true,
    cell: ({ row }) => (
     <span className="font-bold text-foreground block truncate max-w-35" title={row.original.id}>
      {row.original.id}
     </span>
    ),
   },
   {
    id: 'status',
    accessorFn: (row) => row.status,
    header: 'Status',
    enableSorting: true,
    cell: ({ row }) => {
     const status = row.original.status;
     return (
      <span
       className={cn(
        'px-2 py-0.5 rounded text-xs font-bold border inline-block',
        status === 'COMPLETED'
         ? 'bg-success/10 text-success dark:text-success border-success/30'
         : status === 'RUNNING'
         ? 'bg-brand-facebook/10 text-brand-facebook dark:text-brand-telegram border-brand-facebook/30 animate-pulse'
         : 'bg-error/10 text-error dark:text-error border-error/30'
       )}
      >
       {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' ')}
      </span>
     );
    },
   },
   {
    id: 'startedAt',
    accessorFn: (row) => {
     const value = row.startedAt || row.started_at;
     return value ? new Date(value).getTime() : 0;
    },
    header: 'Started At',
    enableSorting: true,
    meta: { cellClassName: 'text-muted-foreground' },
    cell: ({ row }) => {
     const startedAtStr = row.original.startedAt || row.original.started_at;
     return startedAtStr
      ? new Date(startedAtStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })
      : '-';
    },
   },
   {
    id: 'completedAt',
    accessorFn: (row) => {
     const value = row.completedAt || row.completed_at;
     return value ? new Date(value).getTime() : 0;
    },
    header: 'Completed At',
    enableSorting: true,
    meta: { cellClassName: 'text-muted-foreground' },
    cell: ({ row }) => {
     const completedAtStr = row.original.completedAt || row.original.completed_at;
     return completedAtStr
      ? new Date(completedAtStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '-';
    },
   },
   {
    id: 'duration',
    accessorFn: (row) => row.durationMs ?? row.duration_ms ?? 0,
    header: 'Duration',
    enableSorting: true,
    meta: { headerClassName: 'text-right', cellClassName: 'text-right text-muted-foreground' },
    cell: ({ row }) => {
     const durationMs = row.original.durationMs ?? row.original.duration_ms;
     return durationMs ? `${(durationMs / 1000).toFixed(1)}s` : '-';
    },
   },
   {
    id: 'totalFound',
    accessorFn: (row) => row.totalFound ?? row.total_found ?? 0,
    header: 'Total Found',
    enableSorting: true,
    meta: { headerClassName: 'text-right', cellClassName: 'text-right font-semibold text-foreground' },
    cell: ({ row }) => row.original.totalFound ?? row.original.total_found ?? 0,
   },
   {
    id: 'accepted',
    accessorFn: (row) => row.accepted ?? 0,
    header: 'Accepted',
    enableSorting: true,
    meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
    cell: ({ row }) => (
     <span className="text-success dark:text-success font-bold">
      {row.original.accepted ?? 0}
     </span>
    ),
   },
   {
    id: 'reviewRequired',
    accessorFn: (row) => row.reviewRequired ?? row.review_required ?? 0,
    header: 'Review Req.',
    enableSorting: true,
    meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
    cell: ({ row }) => {
     const reviewRequired = row.original.reviewRequired ?? row.original.review_required ?? 0;
     return (
      <span className={reviewRequired > 0 ? 'text-warning dark:text-warning font-bold' : 'text-muted-foreground'}>
       {reviewRequired}
      </span>
     );
    },
   },
   {
    id: 'duplicates',
    accessorFn: (row) => row.duplicates ?? 0,
    header: 'Duplicates',
    enableSorting: true,
    meta: { headerClassName: 'text-right', cellClassName: 'text-right text-muted-foreground' },
    cell: ({ row }) => row.original.duplicates ?? 0,
   },
   {
    id: 'failed',
    accessorFn: (row) => row.failed ?? 0,
    header: 'Failed',
    enableSorting: true,
    meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
    cell: ({ row }) => {
     const failed = row.original.failed ?? 0;
     return (
      <span className={failed > 0 ? 'text-error dark:text-error font-bold' : 'text-muted-foreground'}>
       {failed}
      </span>
     );
    },
   },
  ];
 }, []);

 return (
  <div className="flex flex-col h-full space-y-2 sm:space-y-4 min-h-0">
   <DataGrid<DiscoveryRun>
    data={runs}
    getRowId={(row) => row.id}
    columns={columns}
    enableSelection={false}
    title="Discovery Runs"
    description="Monitor execution cycles, metrics and scraper performance logs"
    count={runs.length}
    countLabel="runs"
    searchPlaceholder="Search run ID or status..."
    noResults={
     runs.length === 0 ? (
      <div className="border-2 border-dashed border-border/60 rounded-xl flex flex-col items-center gap-2 text-muted-foreground text-xs p-6">
       <ServerIcon className="w-8 h-8 opacity-50 text-muted-foreground" />
       <p className="font-semibold text-foreground text-sm">No discovery runs found</p>
       <p className="text-muted-foreground">Trigger a run to start scraping target sources.</p>
      </div>
     ) : (
      <p className="text-muted-foreground text-xs">No matching run logs found.</p>
     )
    }
    actions={() => (
     <button
      onClick={onTriggerRun}
      className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-all duration-150 active:scale-95 shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
     >
      <PlayIcon className="w-3.5 h-3.5 fill-current" />
      <span>Trigger New Run</span>
     </button>
    )}
   />
  </div>
 );
}
