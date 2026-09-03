'use client';

import { useMemo, useState } from 'react';
import { PlayIcon, CodeBracketIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import CompanyLogo from '@/ui/CompanyLogo';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/ui/DropdownMenu';
import { COMPANY_PROVIDERS } from '../DiscoveryWorkspace';
import { IngestionTarget, RunResult } from '../types';
import { DataGrid, DataGridColumn } from '@/ui/data-grid/DataGrid';
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

const ALL = 'ALL';

type TargetRow = IngestionTarget & { rowId: string };

export function TargetCompaniesTab({
  targets,
  runResults,
  onRunTarget,
}: TargetCompaniesTabProps) {
  const [atsFilter, setAtsFilter] = useState(ALL);

  const rows = useMemo<TargetRow[]>(
    () =>
      targets.map((t, idx) => ({
        ...t,
        rowId: `${toSafeString(t.slug) || toSafeString(t.company)}-${toSafeString(t.ats) || 'ats'}-${idx}`,
      })),
    [targets]
  );

  const atsOptions = useMemo(
    () =>
      Array.from(
        new Set(targets.map((t) => getAtsGroup(toSafeString(t.ats))).filter(Boolean))
      ),
    [targets]
  );

  const filteredRows = useMemo(() => {
    if (atsFilter === ALL) return rows;
    return rows.filter((r) => getAtsGroup(toSafeString(r.ats)) === atsFilter);
  }, [rows, atsFilter]);

  const columns = useMemo<DataGridColumn<TargetRow>[]>(() => {
    return [
      {
        id: 'company',
        accessorFn: (row) => toSafeString(row.company),
        header: 'Company',
        enableSorting: true,
        cell: ({ row }) => {
          const companyStr = toSafeString(row.original.company);
          return (
            <div className="flex items-center gap-3 min-w-0">
              <CompanyLogo
                companyName={companyStr}
                className="w-8 h-8 rounded-lg border border-border/60 bg-card shadow-xs shrink-0"
              />
              <span className="font-semibold text-foreground truncate max-w-[200px]" title={companyStr}>
                {companyStr}
              </span>
            </div>
          );
        },
      },
      {
        id: 'ats',
        // Combined sort/search key keeps the slug and raw ATS searchable via
        // the DataGrid global filter while sorting primarily by ATS group.
        accessorFn: (row) => {
          const atsStr = toSafeString(row.ats);
          return [getAtsGroup(atsStr), atsStr, toSafeString(row.slug)].filter(Boolean).join(' ');
        },
        header: 'ATS / Slug',
        enableSorting: true,
        cell: ({ row }) => {
          const atsStr = toSafeString(row.original.ats);
          const slugStr = toSafeString(row.original.slug);
          return (
            <div className="flex flex-col min-w-0">
              <span className="bg-muted/60 text-muted-foreground text-xs border border-border/40 px-1.5 py-0.5 rounded w-fit">
                {atsStr}
              </span>
              <span className="text-xs text-muted-foreground truncate mt-1">
                slug: {slugStr}
              </span>
            </div>
          );
        },
      },
      {
        id: 'results',
        accessorFn: (row) => runResults[toSafeString(row.slug)]?.saved ?? 0,
        header: 'Status / Results',
        enableSorting: true,
        meta: { cellClassName: 'text-center' },
        cell: ({ row }) => {
          const result = runResults[toSafeString(row.original.slug)];
          const isRunning = result?.running;

          if (result && !result.running) {
            return (
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
            );
          }

          if (isRunning) {
            return <span className="text-xs text-primary animate-pulse flex justify-center">Running scraper...</span>;
          }

          return <span className="flex justify-center">-</span>;
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        meta: { cellClassName: 'text-right' },
        cell: ({ row }) => {
          const target = row.original;
          const isRunning = runResults[toSafeString(target.slug)]?.running;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer focus:outline-none focus-visible:bg-muted/60 focus-visible:text-foreground">
                  <EllipsisHorizontalIcon className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 text-xs">
                <DropdownMenuItem
                  onClick={() => onRunTarget(target, false)}
                  disabled={isRunning}
                  className="cursor-pointer"
                >
                  <PlayIcon className={cn('w-4 h-4 mr-2', isRunning && 'animate-spin')} />
                  {isRunning ? 'Running...' : 'Run'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onRunTarget(target, true)}
                  disabled={isRunning}
                  title="Test Crawl without saving to DB"
                  className="cursor-pointer"
                >
                  <CodeBracketIcon className="w-4 h-4 mr-2" /> Dry run
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runResults]);

  return (
    <div className="flex flex-col h-full space-y-2 sm:space-y-4 min-h-0">
      <DataGrid<TargetRow>
        data={filteredRows}
        getRowId={(row) => row.rowId}
        columns={columns}
        enableSelection={false}
        title="Target Companies"
        count={filteredRows.length}
        countLabel="companies"
        searchPlaceholder="Search companies..."
        statusValue={atsFilter}
        onStatusChange={setAtsFilter}
        statusOptions={[{ value: ALL, label: 'All ATS' }, ...atsOptions.map((ats) => ({ value: ats, label: ats }))]}
        onClear={() => setAtsFilter(ALL)}
      />
    </div>
  );
}
