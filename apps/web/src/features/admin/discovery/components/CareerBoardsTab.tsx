'use client';

import { BoltIcon } from '@heroicons/react/24/outline';
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
    return (
        <div className="space-y-3">
            <div className="border-b border-border/60 pb-2 flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-muted-foreground">
                    Monitored career boards & aggregators
                </span>
                <span className="text-xs text-muted-foreground font-mono">{boards.length} sources</span>
            </div>

            {/* High-density Vercel List View */}
            <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden divide-y divide-border/40 shadow-xs">
                {boards.map(board => {
                    const isRunning = runningBoardId === board.provider;

                    return (
                        <div key={board.provider} className="p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/20 active:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                                <CompanyLogo
                                    companyName={board.providerName}
                                    className="w-7 h-7 rounded-md border border-border/60 bg-card shadow-xs shrink-0"
                                />
                                <div className="min-w-0">
                                    <h3 className="text-xs font-bold text-foreground truncate">{board.providerName}</h3>
                                    <p className="text-xs font-mono text-muted-foreground truncate">{board.provider}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-border/30">
                                {board.hasDetailFetcher ? (
                                    <span className="bg-muted/50 text-muted-foreground font-mono text-xs border border-border/40 px-1.5 py-0.5 rounded">
                                        Detail Fetcher ✓
                                    </span>
                                ) : <span />}

                                <button
                                    onClick={() => onRunBoard(board)}
                                    disabled={isRunning}
                                    className="h-7 px-3 rounded-md bg-muted/40 border border-border/80 text-foreground hover:bg-muted text-xs font-medium transition-all duration-150 active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
                                >
                                    <BoltIcon className={cn("w-3 h-3", isRunning && "animate-spin")} />
                                    <span>{isRunning ? 'Scraping Board...' : 'Scrape Board'}</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
