'use client';

import { ServerIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
import { PluginEntry, IngestionTarget } from '../types';
import { cn } from '@repo/ui/utils/cn';

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
    return (
        <div className="space-y-3">
            <div className="border-b border-border/60 pb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    ATS ENGINE ADAPTER REGISTRY
                </span>
                <span className="text-xs text-muted-foreground font-mono">{adapters.length} active engine adapters</span>
            </div>

            {/* High-density Vercel-style List View */}
            <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden divide-y divide-border/40 shadow-xs">
                {adapters.map(adapter => {
                    const count = companyTargets.filter(t => t.ats === adapter.provider).length;
                    const isRunning = runningAdapterId === adapter.provider;

                    return (
                        <div key={adapter.provider} className="p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/20 active:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-7 h-7 rounded-md border border-border/60 bg-muted/40 flex items-center justify-center shrink-0">
                                    <ServerIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-xs font-bold text-foreground shrink-0">{adapter.providerName}</h3>
                                        <span className="bg-muted/50 text-muted-foreground font-mono text-[9px] border border-border/40 px-1.5 py-0.5 rounded">
                                            {adapter.provider}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">
                                        {count > 0 ? `${count} configured target companies` : 'General ATS Provider Engine'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-border/30">
                                {adapter.hasDetailFetcher ? (
                                    <span className="bg-muted/50 text-muted-foreground font-mono text-[9px] border border-border/40 px-1.5 py-0.5 rounded">
                                        Detail Fetcher ✓
                                    </span>
                                ) : <span />}

                                <button
                                    onClick={() => onRunAdapterBatch(adapter)}
                                    disabled={isRunning}
                                    className="h-7 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors duration-150 active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
                                >
                                    <RocketLaunchIcon className={cn("w-3 h-3", isRunning && "animate-spin")} />
                                    <span>{isRunning ? 'Running Batch...' : 'Run Adapter Crawlers'}</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
