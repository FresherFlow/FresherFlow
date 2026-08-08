'use client';

import { CpuChipIcon, CodeBracketIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import CompanyLogo from '@/ui/CompanyLogo';
import { Opportunity, HashTab } from '../types';

interface OpportunityQueueTabProps {
  opportunities: Opportunity[];
  isLoading: boolean;
  activeHash: HashTab;
  onPublish: (id: string) => void;
  onReject: (id: string) => void;
  onInspectPayload: (data: unknown) => void;
  isActionLoading: string | null;
  onPublishAll?: () => void;
}

export function OpportunityQueueTab({
  opportunities,
  isLoading,
  activeHash,
  onPublish,
  onReject,
  onInspectPayload,
  isActionLoading,
  onPublishAll,
}: OpportunityQueueTabProps) {
  const getTabTitle = () => {
    if (activeHash === 'queue') return 'INGESTION REVIEW QUEUE (PENDING)';
    if (activeHash === 'verified') return 'VERIFIED DIRECTORY (PUBLISHED)';
    return 'HOLD & ARCHIVED DRAFTS';
  };

  return (
    <div className="space-y-3">
      <div className="border-b border-border/60 pb-2.5 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {getTabTitle()}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono">{opportunities.length} records</span>
          {activeHash === 'queue' && opportunities.length > 0 && onPublishAll && (
            <button
              onClick={onPublishAll}
              className="h-7 px-3 rounded-md text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-transform duration-100 ease-out active:scale-[0.96] shadow-xs cursor-pointer"
            >
              Publish All
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center border border-dashed border-border/80 rounded-2xl bg-card/40 backdrop-blur-xs">
          <p className="text-xs font-mono text-muted-foreground animate-pulse">Loading opportunities...</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-border/80 rounded-2xl max-w-md mx-auto my-6 bg-card/40 backdrop-blur-xs">
          <CpuChipIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-60" />
          <p className="text-sm font-bold text-foreground">No items in this section</p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Discovered opportunities from ATS connectors will stream here automatically.
          </p>
        </div>
      ) : (
        <div className="flex flex-col border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden divide-y divide-border/40 shadow-xs">
          {opportunities.map((job, index) => {
            return (
              <div
                key={job.id}
                className="flex items-center justify-between gap-3 p-2.5 sm:px-4 sm:py-3 hover:bg-muted/20 active:bg-muted/30 transition-colors duration-150 ease-out animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CompanyLogo
                    companyName={job.company}
                    companyLogoUrl={job.companyLogoUrl}
                    applyLink={job.applyLink}
                    className="w-8 h-8 rounded-md border border-border/60 bg-card shadow-xs shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground truncate shrink-0">{job.title}</h3>
                      <span className="text-xs font-medium text-muted-foreground truncate">{job.company}</span>
                      <span className="bg-muted/50 text-muted-foreground font-mono text-[9px] border border-border/40 px-1.5 py-0.5 rounded truncate uppercase">
                        {job.source || 'ATS'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <button
                        onClick={() => onInspectPayload(job)}
                        className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <CodeBracketIcon className="w-3 h-3" /> payload
                      </button>
                      {job.applyLink && (
                        <a
                          href={job.applyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <ArrowTopRightOnSquareIcon className="w-3 h-3" /> link
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  {activeHash === 'queue' && (
                    <>
                      <button
                        onClick={() => onPublish(job.id)}
                        disabled={isActionLoading === job.id}
                        className="h-7 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-transform duration-100 ease-out active:scale-[0.96] shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        Publish
                      </button>
                      <button
                        onClick={() => onReject(job.id)}
                        disabled={isActionLoading === job.id}
                        title="Archive"
                        className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60 bg-muted/40 hover:bg-destructive/10 text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-transform duration-100 ease-out active:scale-[0.96] cursor-pointer disabled:opacity-50"
                      >
                        <span className="text-lg leading-none mb-0.5">×</span>
                      </button>
                    </>
                  )}
                  {activeHash === 'verified' && (
                    <span className="text-[10px] font-mono text-emerald-500 font-bold px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                      PUBLISHED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
