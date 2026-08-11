'use client';

import { useState } from 'react';
import { BriefcaseIcon, BoltIcon, ClockIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import CompanyLogo from '@/ui/CompanyLogo';
import { PluginEntry } from '../types';
import { Button } from '@/ui/Button';
import { cn } from '@repo/ui/utils/cn';


interface JobBoardsTabProps {
  boards?: PluginEntry[];
  runningBoardId?: string | null;
  onRunBoard?: (boardSlug: string) => void;
}

export function JobBoardsTab({
  boards = [],
  runningBoardId = null,
  onRunBoard,
}: JobBoardsTabProps) {
  const [search, setSearch] = useState('');
  const [runningId, setRunningId] = useState<string | null>(null);

  const filteredBoards = boards.filter(b => {
    const providerStr = String(b.provider || '');
    const providerNameStr = String(b.providerName || '');
    const searchLower = (search || '').toLowerCase();

    return (
      providerStr.toLowerCase().includes(searchLower) ||
      providerNameStr.toLowerCase().includes(searchLower)
    );
  });

  function handleRun(provider: string) {
    if (onRunBoard) {
      onRunBoard(provider);
    } else {
      setRunningId(provider);
      setTimeout(() => setRunningId(null), 2500);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <BriefcaseIcon className="w-4 h-4 text-primary" />
            Job boards & aggregators
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            {boards.length} monitored career aggregators and job feeds
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search job boards..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border/80 bg-card text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredBoards.map(board => {
          const isRunning = runningBoardId === board.provider || runningId === board.provider;

          return (
            <div
              key={board.provider}
              className="border border-border/60 rounded-xl p-4 bg-card/60 backdrop-blur-md flex flex-col justify-between gap-4 shadow-xs hover:border-border transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CompanyLogo
                    companyName={board.providerName}
                    className="w-8 h-8 rounded-lg border border-border/60 bg-card shadow-xs shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-foreground truncate">{board.providerName}</h3>
                    <p className="text-xs font-mono text-muted-foreground truncate">{board.provider}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div className="p-2 rounded-lg bg-muted/40 border border-border/30">
                    <span className="text-xs text-muted-foreground block">Jobs Found</span>
                    <span className="font-bold text-foreground">-</span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40 border border-border/30">
                    <span className="text-xs text-muted-foreground block">Last Scraped</span>
                    <span className="font-medium text-foreground text-xs truncate block">
                      Unknown
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="admin"
                size="sm"
                onClick={() => handleRun(board.provider)}
                disabled={isRunning}
                className="w-full"
              >
                <BoltIcon className={cn('w-3.5 h-3.5 mr-1.5', isRunning && 'animate-spin')} />
                {isRunning ? 'Scraping board...' : 'Scrape board now'}
              </Button>
            </div>
          );
        })}

        {filteredBoards.length === 0 && (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-border/60 rounded-xl flex flex-col items-center gap-2 text-muted-foreground font-mono text-xs">
            <BriefcaseIcon className="w-6 h-6 opacity-50" />
            No job boards found matching &quot;{search}&quot;.
          </div>
        )}
      </div>
    </div>
  );
}
