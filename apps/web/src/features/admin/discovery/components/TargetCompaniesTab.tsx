'use client';

import { PlayIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import CompanyLogo from '@/ui/CompanyLogo';
import { IngestionTarget, RunResult } from '../types';
import { cn } from '@repo/ui/utils/cn';

interface TargetCompaniesTabProps {
    targets: IngestionTarget[];
    runResults: Record<string, RunResult & { running?: boolean }>;
    onRunTarget: (target: IngestionTarget, isDryRun?: boolean) => void;
}

export function TargetCompaniesTab({
    targets,
    runResults,
    onRunTarget,
}: TargetCompaniesTabProps) {
    return (
        <div className="space-y-3">
            <div className="border-b border-border/60 pb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    COMPANY TARGET DIRECTORY
                </span>
                <span className="text-xs text-muted-foreground font-mono">{targets.length} targets</span>
            </div>

            {/* High-density Vercel-style List View */}
            <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden divide-y divide-border/40 shadow-xs">
                {targets.map(t => {
                    const result = runResults[t.slug];
                    const isRunning = result?.running;

                    return (
                        <div key={t.slug} className="p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/20 active:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                                <CompanyLogo
                                    companyName={t.company}
                                    className="w-7 h-7 rounded-md border border-border/60 bg-card shadow-xs shrink-0"
                                />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-xs font-bold text-foreground shrink-0">{t.company}</h3>
                                        {t.ats.toLowerCase() !== t.company.toLowerCase() && (
                                            <span className="bg-muted/50 text-muted-foreground font-mono text-[9px] border border-border/40 px-1.5 py-0.5 rounded uppercase">
                                                {t.ats}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">{t.slug}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-border/30">
                                {result && !result.running ? (
                                    <div className="px-2 py-0.5 rounded bg-muted/40 border border-border/40 text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
                                        <span><strong className="text-foreground">{result.saved}</strong> saved</span>
                                        <span>•</span>
                                        <span><strong className="text-foreground">{result.skipped}</strong> skipped</span>
                                        <span>•</span>
                                        <span>{(result.durationMs / 1000).toFixed(1)}s</span>
                                    </div>
                                ) : (
                                    <span />
                                )}

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => onRunTarget(t, false)}
                                        disabled={isRunning}
                                        className="h-7 px-2.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors duration-150 active:scale-[0.96] cursor-pointer flex items-center gap-1 disabled:opacity-50 shadow-xs"
                                    >
                                        <PlayIcon className={cn("w-3 h-3", isRunning && "animate-spin")} />
                                        <span>{isRunning ? 'Running...' : 'Run'}</span>
                                    </button>

                                    <button
                                        onClick={() => onRunTarget(t, true)}
                                        disabled={isRunning}
                                        title="Test Crawl without saving to DB"
                                        className="h-7 px-2.5 rounded-md border border-border/80 bg-muted/40 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-150 active:scale-[0.96] cursor-pointer flex items-center gap-1 disabled:opacity-50 font-mono"
                                    >
                                        <CodeBracketIcon className={cn("w-3 h-3", isRunning && "animate-spin")} />
                                        <span>Dry Run</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
