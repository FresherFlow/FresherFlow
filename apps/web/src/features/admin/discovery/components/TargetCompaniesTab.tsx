'use client';

import { useState, useEffect } from 'react';
import { PlayIcon, CodeBracketIcon, MagnifyingGlassIcon, BuildingOfficeIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';
import { PaginationControls } from '@/ui/data-table/DataTablePagination';
import CompanyLogo from '@/ui/CompanyLogo';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/ui/DropdownMenu';
import { Button } from '@/ui/Button';
import { COMPANY_PROVIDERS } from '../DiscoveryWorkspace';
import { IngestionTarget, RunResult } from '../types';
import { cn } from '@repo/ui/utils/cn';

interface TargetCompaniesTabProps {
 targets: IngestionTarget[];
 runResults: Record<string, RunResult & { running?: boolean }>;
 onRunTarget: (target: IngestionTarget, isDryRun?: boolean) => void;
}

function toSafeString(val: unknown): string {
 if (val === null || val === undefined) return '';
 if (typeof val === 'string') return val;
 if (typeof val === 'object') {
 if ('name' in (val as Record<string, unknown>) && typeof (val as Record<string, unknown>).name === 'string') {
 return (val as Record<string, unknown>).name as string;
 }
 if ('company' in (val as Record<string, unknown>) && typeof (val as Record<string, unknown>).company === 'string') {
 return (val as Record<string, unknown>).company as string;
 }
 }
 return String(val);
}

const getAtsGroup = (ats: string) => {
 if (!ats) return '';
 const lower = ats.toLowerCase();
 return COMPANY_PROVIDERS.has(lower) ? 'Careers' : ats;
};

export function TargetCompaniesTab({
 targets,
 runResults,
 onRunTarget,
}: TargetCompaniesTabProps) {
 const [search, setSearch] = useState('');
 const [atsFilter, setAtsFilter] = useState('ALL');
 const [pageIndex, setPageIndex] = useState(0);
 const [pageSize, setPageSize] = useState(20);

 useEffect(() => {
   setPageIndex(0);
 }, [search, atsFilter]);

 const atsOptions = ['ALL', ...Array.from(new Set(targets.map(t => getAtsGroup(toSafeString(t.ats))).filter(Boolean)))];

 const filteredTargets = targets.filter(t => {
 const companyStr = toSafeString(t.company);
 const slugStr = toSafeString(t.slug);
 const atsStr = toSafeString(t.ats);
 const atsGroup = getAtsGroup(atsStr);
 const searchLower = (search || '').toLowerCase();

 return (
 (atsFilter === 'ALL' || atsGroup === atsFilter) &&
 (companyStr.toLowerCase().includes(searchLower) ||
 slugStr.toLowerCase().includes(searchLower) ||
 atsGroup.toLowerCase().includes(searchLower) ||
 atsStr.toLowerCase().includes(searchLower))
 );
 });

 const paginatedTargets = filteredTargets.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

 return (
    <div className="flex flex-col h-full space-y-2 sm:space-y-4 min-h-0">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 border-b-0 sm:border-b border-border/60 pb-0 sm:pb-3">
        <div className="hidden md:block">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <BuildingOfficeIcon className="w-4 h-4 text-primary" />
            Target Company Directory
          </h2>
          <p className="hidden md:block text-xs text-muted-foreground mt-0.5">
            {targets.length} registered company ATS career pages
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full sm:w-40 px-3 py-1.5 rounded-lg border border-border/80 bg-card text-sm font-medium focus:outline-none focus-visible:bg-muted/60 focus-visible:text-foreground h-auto flex items-center justify-between">
              {atsFilter === 'ALL' ? 'All ats types' : atsFilter}
              <ChevronDownIcon className="w-4 h-4 ml-2 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full sm:w-40 max-h-[300px] overflow-y-auto">
              {atsOptions.map(ats => (
                <DropdownMenuItem key={ats} onClick={() => setAtsFilter(ats)}>
                  {ats === 'ALL' ? 'All ats types' : ats}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search targets or ATS..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border/80 bg-card text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus-visible:bg-muted/60 focus-visible:text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Table View */}
      <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden shadow-xs flex flex-col flex-1 min-h-0">
        <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
          <Table className="w-full text-left border-collapse">
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md shadow-xs">
              <TableRow className="border-b border-border/60 text-xs font-semibold tracking-wider text-muted-foreground">
                <TableHead className="py-3 px-4 font-medium">Company</TableHead>
                <TableHead className="py-3 px-4 font-medium">ATS / Slug</TableHead>
                <TableHead className="py-3 px-4 text-center font-medium">Status / Results</TableHead>
                <TableHead className="py-3 px-4 text-right font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40 text-xs">
              {paginatedTargets.map((t, idx) => {
                const companyStr = toSafeString(t.company);
                const slugStr = toSafeString(t.slug);
                const atsStr = toSafeString(t.ats);
                const result = runResults[slugStr];
                const isRunning = result?.running;

                return (
                  <TableRow
                    key={`${slugStr || companyStr}-${atsStr || 'ats'}-${idx}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <CompanyLogo
                          companyName={companyStr}
                          className="w-8 h-8 rounded-lg border border-border/60 bg-card shadow-xs shrink-0"
                        />
                        <span className="font-semibold text-foreground truncate max-w-[200px]">
                          {companyStr}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      <div className="flex flex-col min-w-0">
                        <span className="bg-muted/60 text-muted-foreground text-xs border border-border/40 px-1.5 py-0.5 rounded w-fit">
                          {atsStr}
                        </span>
                        <span className="text-xs text-muted-foreground truncate mt-1">
                          slug: {slugStr}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4 text-center">
                      {result && !result.running ? (
                        <div className="px-2.5 py-1 rounded-md bg-muted/40 border border-border/40 text-xs text-muted-foreground flex items-center justify-center gap-2 mx-auto w-fit">
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              result.status === 'OK'
                                ? 'bg-emerald-500'
                                : result.status === 'TIMEOUT'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            )}
                          />
                          <span>
                            <strong className="text-foreground">{result.saved}</strong> saved ·{' '}
                            <strong className="text-foreground">{result.skipped}</strong> skipped ·{' '}
                            {((result.durationMs ?? 0) / 1000).toFixed(1)}s
                          </span>
                        </div>
                      ) : isRunning ? (
                        <span className="text-xs text-primary animate-pulse flex justify-center">Running scraper...</span>
                      ) : (
                        <span className="flex justify-center">-</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="admin"
                          size="sm"
                          onClick={() => onRunTarget(t, false)}
                          disabled={isRunning}
                          className="h-7"
                        >
                          <PlayIcon className={cn('w-3 h-3 mr-1.5', isRunning && 'animate-spin')} />
                          {isRunning ? 'Running...' : 'Run'}
                        </Button>

                        <Button
                          variant="admin"
                          size="sm"
                          onClick={() => onRunTarget(t, true)}
                          disabled={isRunning}
                          title="Test Crawl without saving to DB"
                          className="h-7"
                        >
                          <CodeBracketIcon className={cn('w-3 h-3 mr-1', isRunning && 'animate-spin')} />
                          Dry run
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredTargets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="p-12 text-center text-muted-foreground text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <BuildingOfficeIcon className="w-6 h-6 opacity-50" />
                      No target companies found matching &quot;{search}&quot;.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {filteredTargets.length > 0 && (
          <PaginationControls
            pageIndex={pageIndex}
            pageSize={pageSize}
            pageCount={Math.ceil(filteredTargets.length / pageSize)}
            totalRows={filteredTargets.length}
            canPreviousPage={pageIndex > 0}
            canNextPage={pageIndex < Math.ceil(filteredTargets.length / pageSize) - 1}
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
