'use client';

import { useState } from 'react';
import { PlayIcon, CodeBracketIcon, MagnifyingGlassIcon, BuildingOfficeIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import CompanyLogo from '@/ui/CompanyLogo';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/ui/DropdownMenu';
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

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <BuildingOfficeIcon className="w-4 h-4 text-primary" />
            target company directory
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">
            {targets.length} registered company ATS career pages
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full sm:w-40 px-3 py-1.5 rounded-lg border border-border/80 bg-card text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary h-auto flex items-center justify-between">
              {atsFilter === 'ALL' ? 'All ATS Types' : atsFilter}
              <ChevronDownIcon className="w-4 h-4 ml-2 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full sm:w-40 max-h-[300px] overflow-y-auto">
              {atsOptions.map(ats => (
                <DropdownMenuItem key={ats} onClick={() => setAtsFilter(ats)}>
                  {ats === 'ALL' ? 'All ATS Types' : ats}
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
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border/80 bg-card text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* List View */}
      <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden divide-y divide-border/40 shadow-xs">
        {filteredTargets.map((t, idx) => {
          const companyStr = toSafeString(t.company);
          const slugStr = toSafeString(t.slug);
          const atsStr = toSafeString(t.ats);
          const result = runResults[slugStr];
          const isRunning = result?.running;

          return (
            <div
              key={`${slugStr || companyStr}-${atsStr || 'ats'}-${idx}`}
              className="p-3.5 sm:px-4 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <CompanyLogo
                  companyName={companyStr}
                  className="w-8 h-8 rounded-lg border border-border/60 bg-card shadow-xs shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-medium text-foreground truncate">{companyStr}</h3>
                    <span className="bg-muted/60 text-muted-foreground font-mono text-xs border border-border/40 px-1.5 py-0.5 rounded ">
                      {atsStr}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">
                    slug: {slugStr}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/30">
                {result && !result.running ? (
                  <div className="px-2.5 py-1 rounded-md bg-muted/40 border border-border/40 text-xs font-mono text-muted-foreground flex items-center gap-2">
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
                  <span className="text-xs font-mono text-primary animate-pulse">Running scraper...</span>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onRunTarget(t, false)}
                    disabled={isRunning}
                    className="h-7 px-3 rounded-md border border-border/80 bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-all active:scale-[0.96] cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                  >
                    <PlayIcon className={cn('w-3 h-3 fill-current', isRunning && 'animate-spin')} />
                    <span>{isRunning ? 'Running...' : 'Run'}</span>
                  </button>

                  <button
                    onClick={() => onRunTarget(t, true)}
                    disabled={isRunning}
                    title="Test Crawl without saving to DB"
                    className="h-7 px-2.5 rounded-md border border-border/80 bg-muted/40 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all active:scale-[0.96] cursor-pointer flex items-center gap-1 disabled:opacity-50 font-mono"
                  >
                    <CodeBracketIcon className={cn('w-3 h-3', isRunning && 'animate-spin')} />
                    <span>Dry Run</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTargets.length === 0 && (
          <div className="p-12 text-center border-2 border-dashed border-border/60 rounded-xl m-4 text-muted-foreground font-mono text-sm flex flex-col items-center gap-2">
            <BuildingOfficeIcon className="w-6 h-6 opacity-50" />
            No target companies found matching &quot;{search}&quot;.
          </div>
        )}
      </div>
    </div>
  );
}

