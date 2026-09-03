'use client';

import { useMemo } from 'react';
import { ServerIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
import { DataGrid, DataGridColumn } from '@/ui/data-grid/DataGrid';
import { PluginEntry, IngestionTarget } from '../types';
import { Button } from '@/ui/Button';
import { cn } from '@repo/ui/utils/cn';

const BOARD_PROVIDERS = new Set([
 'glassdoor',
 'hackernews',
 'hasjob',
 'indeed',
 'internshala',
 'linkedin',
 'naukri',
 'remoteok',
 'wellfound',
 'weworkremotely',
 'bayt',
]);

const COMPANY_PROVIDERS = new Set([
 'google',
 'amazon',
 'microsoft',
 'ibm',
 'apple',
 'uber',
 'stripe',
 'meta',
 'nvidia',
]);

interface AtsAdaptersTabProps {
 adapters: PluginEntry[];
 companyTargets: IngestionTarget[];
 runningAdapterId: string | null;
 onRunAdapterBatch: (adapter: PluginEntry) => void;
}

function getAdapterTypeBadge(provider: string): string {
 if (BOARD_PROVIDERS.has(provider)) return 'Job board';
 if (COMPANY_PROVIDERS.has(provider)) return 'Company direct';
 return 'Ats';
}

export function AtsAdaptersTab({
 adapters,
 companyTargets,
 runningAdapterId,
 onRunAdapterBatch,
}: AtsAdaptersTabProps) {
 const columns = useMemo<DataGridColumn<PluginEntry>[]>(() => {
  return [
   {
    id: 'adapter',
    accessorFn: row => row.providerName || row.provider,
    header: 'Adapter',
    enableSorting: true,
    cell: ({ row }) => {
     const adapter = row.original;
     return (
      <div className="flex items-center gap-2.5 min-w-0">
       <div className="w-8 h-8 rounded-lg border border-border/60 bg-muted/40 flex items-center justify-center shrink-0">
        <ServerIcon className="w-4 h-4 text-foreground" />
       </div>
       <div className="min-w-0">
        <h3 className="text-xs font-bold text-foreground truncate">{adapter.providerName}</h3>
        <p className="text-xs text-muted-foreground truncate">{adapter.provider}</p>
       </div>
      </div>
     );
    },
   },
   {
    id: 'type',
    accessorFn: row => getAdapterTypeBadge(row.provider),
    header: 'Type',
    enableSorting: true,
    cell: ({ row }) => {
     const adapter = row.original;
     const typeBadge = getAdapterTypeBadge(adapter.provider);
     return (
      <div className="flex flex-wrap gap-1.5">
       <span
        className={cn(
         'text-[11px] font-semibold px-2 py-0.5 rounded border',
         typeBadge === 'Job board'
          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
          : typeBadge === 'Company direct'
          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
        )}
       >
        {typeBadge}
       </span>
       {adapter.hasDetailFetcher && (
        <span className="bg-muted/60 text-muted-foreground text-[11px] border border-border/40 px-1.5 py-0.5 rounded">
         Detail Fetcher ✓
        </span>
       )}
      </div>
     );
    },
   },
   {
    id: 'targets',
    accessorFn: row => companyTargets.filter(t => t.ats === row.provider).length,
    header: 'Targets',
    enableSorting: true,
    meta: { cellClassName: 'text-center text-muted-foreground' },
    cell: ({ row }) => `${companyTargets.filter(t => t.ats === row.original.provider).length} targets`,
   },
   {
    id: 'actions',
    header: '',
    enableSorting: false,
    meta: { cellClassName: 'text-right' },
    cell: ({ row }) => {
     const adapter = row.original;
     const isRunning = runningAdapterId === adapter.provider;
     return (
      <Button
       variant="admin"
       size="sm"
       onClick={() => onRunAdapterBatch(adapter)}
       disabled={isRunning}
       className="ml-auto"
      >
       <RocketLaunchIcon className={cn('w-3.5 h-3.5 mr-1.5', isRunning && 'animate-spin')} />
       {isRunning ? 'Running batch...' : `Run all for ${adapter.providerName}`}
      </Button>
     );
    },
   },
  ];
 }, [companyTargets, runningAdapterId, onRunAdapterBatch]);

 return (
  <div className="flex flex-col h-full space-y-2 sm:space-y-4 min-h-0">
   <DataGrid<PluginEntry>
    data={adapters}
    getRowId={row => row.provider}
    columns={columns}
    enableSelection={false}
    title="ATS Engine Adapter Registry"
    count={adapters.length}
    countLabel="adapters"
    searchPlaceholder="Search ATS adapters..."
    noResults={<span className="text-muted-foreground text-xs">No ATS adapters found.</span>}
   />
  </div>
 );
}
