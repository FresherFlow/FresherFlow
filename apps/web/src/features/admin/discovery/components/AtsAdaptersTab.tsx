'use client';

import { useState } from 'react';
import { ServerIcon, RocketLaunchIcon, CpuChipIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { PluginEntry, IngestionTarget } from '../types';
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

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CpuChipIcon className="w-4 h-4 text-primary" />
            Ats engine adapter registry
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
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

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAdapters.map(adapter => {
          const targetCount = companyTargets.filter(t => t.ats === adapter.provider).length;
          const isRunning = runningAdapterId === adapter.provider;

          let typeBadge = 'ATS';
          if (BOARD_PROVIDERS.has(adapter.provider)) typeBadge = 'Job Board';
          else if (COMPANY_PROVIDERS.has(adapter.provider)) typeBadge = 'Company Direct';

          return (
            <div
              key={adapter.provider}
              className="border border-border/60 rounded-xl p-4 bg-card/60 backdrop-blur-md flex flex-col justify-between gap-4 shadow-xs hover:border-border transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg border border-border/60 bg-muted/40 flex items-center justify-center shrink-0">
                      <ServerIcon className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-foreground truncate">{adapter.providerName}</h3>
                      <p className="text-xs font-mono text-muted-foreground truncate">{adapter.provider}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span
                    className={cn(
                      'text-xs font-mono font-semibold px-2 py-0.5 rounded border',
                      typeBadge === 'Job Board'
                        ? 'bg-purple-500/10 text-foreground border-purple-500/20'
                        : typeBadge === 'Company Direct'
                        ? 'bg-blue-500/10 text-foreground border-blue-500/20'
                        : 'bg-emerald-500/10 text-foreground border-emerald-500/20'
                    )}
                  >
                    {typeBadge}
                  </span>

                  {adapter.hasDetailFetcher && (
                    <span className="bg-muted/60 text-muted-foreground font-mono text-xs border border-border/40 px-1.5 py-0.5 rounded">
                      Detail Fetcher ✓
                    </span>
                  )}

                  <span className="bg-muted/60 text-muted-foreground font-mono text-xs border border-border/40 px-1.5 py-0.5 rounded">
                    {targetCount} targets
                  </span>
                </div>
              </div>

              <button
                onClick={() => onRunAdapterBatch(adapter)}
                disabled={isRunning}
                className="w-full h-8 px-3 rounded-lg bg-muted/40 border border-border/80 text-foreground hover:bg-muted text-xs font-medium transition-all active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
              >
                <RocketLaunchIcon className={cn('w-3.5 h-3.5', isRunning && 'animate-spin')} />
                <span>{isRunning ? 'Running Batch...' : `Run All for ${adapter.providerName}`}</span>
              </button>
            </div>
          );
        })}

        {filteredAdapters.length === 0 && (
          <div className="col-span-full p-12 text-center text-muted-foreground font-mono text-xs">
            No ATS adapters found matching &quot;{search}&quot;.
          </div>
        )}
      </div>
    </div>
  );
}
