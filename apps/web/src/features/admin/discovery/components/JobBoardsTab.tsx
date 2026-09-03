'use client';

import { useMemo, useState } from 'react';
import { BriefcaseIcon, BoltIcon } from '@heroicons/react/24/outline';
import { DataGrid, DataGridColumn } from '@/ui/data-grid/DataGrid';
import CompanyLogo from '@/ui/CompanyLogo';
import { PluginEntry } from '../types';
import { Button } from '@/ui/Button';
import { cn } from '@repo/ui/utils/cn';


interface JobBoardsTabProps {
 boards?: PluginEntry[];
 runningBoardId?: string | null;
 onRunBoard?: (board: string) => void;
}

export function JobBoardsTab({
 boards = [],
 runningBoardId = null,
 onRunBoard,
}: JobBoardsTabProps) {
 const [runningId, setRunningId] = useState<string | null>(null);

 function handleRun(provider: string) {
  if (onRunBoard) {
   onRunBoard(provider);
  } else {
   setRunningId(provider);
   setTimeout(() => setRunningId(null), 2500);
  }
 }

 const columns = useMemo<DataGridColumn<PluginEntry>[]>(() => {
  return [
   {
    id: 'provider',
    accessorFn: row => row.providerName || row.provider,
    header: 'Provider',
    enableSorting: true,
    cell: ({ row }) => {
     const board = row.original;
     return (
      <div className="flex items-center gap-3 min-w-0">
       <CompanyLogo
        companyName={board.providerName}
        className="w-8 h-8 rounded-lg border border-border/60 bg-card shadow-xs shrink-0"
       />
       <div className="min-w-0">
        <h3 className="text-xs font-bold text-foreground truncate">{board.providerName}</h3>
        <p className="text-xs text-muted-foreground truncate">{board.provider}</p>
       </div>
      </div>
     );
    },
   },
   {
    id: 'jobsFound',
    accessorFn: () => 0,
    header: 'Jobs Found',
    enableSorting: true,
    meta: { cellClassName: 'text-center' },
    cell: () => <span className="font-bold text-foreground">-</span>,
   },
   {
    id: 'lastScraped',
    accessorFn: () => 'Unknown',
    header: 'Last Scraped',
    enableSorting: true,
    meta: { cellClassName: 'text-center' },
    cell: () => <span className="font-medium text-foreground text-xs truncate">Unknown</span>,
   },
   {
    id: 'actions',
    header: '',
    enableSorting: false,
    meta: { cellClassName: 'text-right' },
    cell: ({ row }) => {
     const board = row.original;
     const isRunning = runningBoardId === board.provider || runningId === board.provider;
     return (
      <Button
       variant="admin"
       size="sm"
       onClick={() => handleRun(board.provider)}
       disabled={isRunning}
       className="ml-auto"
      >
       <BoltIcon className={cn('w-3.5 h-3.5 mr-1.5', isRunning && 'animate-spin')} />
       {isRunning ? 'Scraping board...' : 'Scrape board now'}
      </Button>
     );
    },
   },
  ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [runningBoardId, runningId, onRunBoard]);

 return (
  <div className="flex flex-col h-full space-y-2 sm:space-y-4 min-h-0">
   <DataGrid<PluginEntry>
    data={boards}
    getRowId={row => row.provider}
    columns={columns}
    enableSelection={false}
    title="Job boards & aggregators"
    count={boards.length}
    countLabel="boards"
    searchPlaceholder="Search job boards..."
    noResults={
     <div className="flex flex-col items-center gap-2">
      <BriefcaseIcon className="w-6 h-6 opacity-50 mx-auto" />
      <span className="text-muted-foreground text-xs">No job boards found.</span>
     </div>
    }
   />
  </div>
 );
}
