'use client';

import { useState, useEffect } from 'react';
import { ServerIcon, RocketLaunchIcon, CpuChipIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';
import { PaginationControls } from '@/ui/data-table/DataTablePagination';
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

export function AtsAdaptersTab({
 adapters,
 companyTargets,
 runningAdapterId,
 onRunAdapterBatch,
}: AtsAdaptersTabProps) {
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setPageIndex(0);
  }, [search]);

 // Filter out board providers if wanted, or categorize
 const filteredAdapters = adapters.filter(a => {
 const providerStr = String(a.provider || '');
 const providerNameStr = String(a.providerName || '');
 const searchLower = (search || '').toLowerCase();

 return (
 providerStr.toLowerCase().includes(searchLower) ||
 providerNameStr.toLowerCase().includes(searchLower)
 );
 });

  const paginatedAdapters = filteredAdapters.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  return (
    <div className="flex flex-col h-full space-y-2 sm:space-y-4 min-h-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 border-b-0 sm:border-b border-border/60 pb-0 sm:pb-3">
        <div className="hidden md:block">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CpuChipIcon className="w-4 h-4 text-primary" />
            ATS Engine Adapter Registry
          </h2>
          <p className="hidden md:block text-xs text-muted-foreground mt-0.5">
            {adapters.length} installed ATS plugins & scraping engine adapters
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ATS adapters..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border/80 bg-card text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Table View */}
      <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden shadow-xs flex flex-col flex-1 min-h-0">
        <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
          <Table className="w-full text-left border-collapse">
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md shadow-xs">
              <TableRow className="border-b border-border/60 text-xs font-semibold tracking-wider text-muted-foreground">
                <TableHead className="py-3 px-4 font-medium">Adapter</TableHead>
                <TableHead className="py-3 px-4 font-medium">Type</TableHead>
                <TableHead className="py-3 px-4 text-center font-medium">Targets</TableHead>
                <TableHead className="py-3 px-4 text-right font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40 text-xs">
              {paginatedAdapters.map(adapter => {
                const targetCount = companyTargets.filter(t => t.ats === adapter.provider).length;
                const isRunning = runningAdapterId === adapter.provider;

                let typeBadge = 'Ats';
                if (BOARD_PROVIDERS.has(adapter.provider)) typeBadge = 'Job board';
                else if (COMPANY_PROVIDERS.has(adapter.provider)) typeBadge = 'Company direct';

                return (
                  <TableRow
                    key={adapter.provider}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg border border-border/60 bg-muted/40 flex items-center justify-center shrink-0">
                          <ServerIcon className="w-4 h-4 text-foreground" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-foreground truncate">{adapter.providerName}</h3>
                          <p className="text-xs text-muted-foreground truncate">{adapter.provider}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4">
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
                    </TableCell>

                    <TableCell className="py-3 px-4 text-center text-muted-foreground">
                      {targetCount} targets
                    </TableCell>

                    <TableCell className="py-3 px-4 text-right">
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
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredAdapters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="p-12 text-center text-muted-foreground text-xs">
                    No ATS adapters found matching &quot;{search}&quot;.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {filteredAdapters.length > 0 && (
          <PaginationControls
            pageIndex={pageIndex}
            pageSize={pageSize}
            pageCount={Math.ceil(filteredAdapters.length / pageSize)}
            totalRows={filteredAdapters.length}
            canPreviousPage={pageIndex > 0}
            canNextPage={pageIndex < Math.ceil(filteredAdapters.length / pageSize) - 1}
            setPageIndex={setPageIndex}
            setPageSize={setPageSize}
            previousPage={() => setPageIndex(p => Math.max(0, p - 1))}
            nextPage={() => setPageIndex(p => p + 1)}
          />
        )}
      </div>
    </div>
  );
}
