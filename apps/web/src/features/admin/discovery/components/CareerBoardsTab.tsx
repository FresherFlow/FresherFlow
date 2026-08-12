'use client';

import { useState, useEffect } from 'react';
import { BoltIcon } from '@heroicons/react/24/outline';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';
import { PaginationControls } from '@/ui/data-table/DataTablePagination';
import CompanyLogo from '@/ui/CompanyLogo';
import { PluginEntry } from '../types';
import { cn } from '@repo/ui/utils/cn';

interface CareerBoardsTabProps {
 boards: PluginEntry[];
 runningBoardId: string | null;
 onRunBoard: (board: PluginEntry) => void;
}

export function CareerBoardsTab({
  boards,
  runningBoardId,
  onRunBoard,
}: CareerBoardsTabProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setPageIndex(0);
  }, [boards.length]);

  const paginatedBoards = boards.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  return (
 <div className="space-y-3">
 <div className="border-b border-border/60 pb-2 flex items-center justify-between">
 <span className="text-xs font-bold tracking-wider text-muted-foreground">
 Monitored career boards & aggregators
 </span>
 <span className="text-xs text-muted-foreground">{boards.length} sources</span>
 </div>

      {/* Table View */}
      <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden shadow-xs flex flex-col flex-1 min-h-0">
        <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
          <Table className="w-full text-left border-collapse">
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md shadow-xs">
              <TableRow className="border-b border-border/60 text-xs font-semibold tracking-wider text-muted-foreground">
                <TableHead className="py-3 px-4 font-medium">Provider</TableHead>
                <TableHead className="py-3 px-4 font-medium">Features</TableHead>
                <TableHead className="py-3 px-4 text-right font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40 text-xs">
              {paginatedBoards.map(board => {
                const isRunning = runningBoardId === board.provider;

                return (
                  <TableRow key={board.provider} className="hover:bg-muted/30 active:bg-muted/30 transition-colors">
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <CompanyLogo
                          companyName={board.providerName}
                          className="w-7 h-7 rounded-md border border-border/60 bg-card shadow-xs shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-foreground truncate">{board.providerName}</h3>
                          <p className="text-xs text-muted-foreground truncate">{board.provider}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      {board.hasDetailFetcher ? (
                        <span className="bg-muted/50 text-muted-foreground text-[11px] border border-border/40 px-1.5 py-0.5 rounded">
                          Detail Fetcher ✓
                        </span>
                      ) : <span />}
                    </TableCell>

                    <TableCell className="py-3 px-4 text-right">
                      <button
                        onClick={() => onRunBoard(board)}
                        disabled={isRunning}
                        className="h-7 px-3 rounded-md bg-muted/40 border border-border/80 text-foreground hover:bg-muted text-xs font-medium transition-all duration-150 active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs ml-auto"
                      >
                        <BoltIcon className={cn("w-3 h-3", isRunning &&"animate-spin")} />
                        <span>{isRunning ? 'Scraping Board...' : 'Scrape Board'}</span>
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {boards.length > 0 && (
          <PaginationControls
            pageIndex={pageIndex}
            pageSize={pageSize}
            pageCount={Math.ceil(boards.length / pageSize)}
            totalRows={boards.length}
            canPreviousPage={pageIndex > 0}
            canNextPage={pageIndex < Math.ceil(boards.length / pageSize) - 1}
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

