'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/Dialog';
import CompanyLogo from '@/ui/CompanyLogo';
import {
  ArrowTopRightOnSquareIcon,
  MapPinIcon,
  CodeBracketIcon,
  EyeIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface PayloadModalProps {
  open: boolean;
  data: any;
  onClose: () => void;
  title?: string;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onPublish?: (id: string) => void;
}

export function PayloadModal({
  open,
  data,
  onClose,
  title,
  onApprove,
  onReject,
  onPublish,
}: PayloadModalProps) {
  const [viewMode, setViewMode] = useState<'structured' | 'json'>('structured');

  if (!data) return null;

  const isJob = Boolean(data && typeof data === 'object' && (data.title || data.company));
  const jobTitle = data.title || 'Job Inspector';
  const companyName = data.company || '';
  const applyLink = data.applyLink || data.apply_link || data.sourceLink;
  const skills: string[] = Array.isArray(data.requiredSkills)
    ? data.requiredSkills
    : Array.isArray(data.required_skills)
      ? data.required_skills
      : [];
  const locations: string[] = Array.isArray(data.locations)
    ? data.locations
    : data.location
      ? [data.location]
      : [];
  const jobType = data.type || (data.atsType ? `ATS: ${data.atsType}` : 'JOB');
  const status = data.status || '';

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 bg-card border border-border/80 rounded-xl shadow-xl">
        <DialogHeader className="pb-2 border-b border-border/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {companyName && (
                <CompanyLogo companyName={companyName} className="w-10 h-10 rounded-lg shrink-0 border border-border/40" />
              )}
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground truncate leading-snug">
                  {title || jobTitle}
                </DialogTitle>
                {companyName && (
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{companyName}</span>
                    {jobType && (
                      <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground border border-border/50">
                        {jobType}
                      </span>
                    )}
                    {status && (
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono font-bold uppercase tracking-wider border border-primary/20">
                        {status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {applyLink && (
              <a
                href={applyLink}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
              >
                <span>Apply Link</span>
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Toggle view mode */}
          {isJob && (
            <div className="flex items-center gap-1 mt-3 bg-muted/40 p-1 rounded-lg border border-border/40 w-fit text-xs">
              <button
                onClick={() => setViewMode('structured')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'structured'
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <EyeIcon className="w-3.5 h-3.5" />
                Structured
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'json'
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CodeBracketIcon className="w-3.5 h-3.5" />
                Raw JSON
              </button>
            </div>
          )}
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs font-sans">
          {viewMode === 'json' || !isJob ? (
            <div className="p-4 bg-muted/30 rounded-lg border border-border/60 font-mono text-[11px] text-foreground">
              <pre className="whitespace-pre-wrap break-all">{JSON.stringify(data, null, 2)}</pre>
            </div>
          ) : (
            <>
              {/* Locations & Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1">
                  <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                    <MapPinIcon className="w-3.5 h-3.5 text-primary" /> Locations
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    {locations.length > 0 ? (
                      locations.map((loc) => (
                        <span key={loc} className="px-2 py-0.5 rounded bg-card text-foreground border border-border/60 font-medium">
                          {loc}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">Not specified</span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1">
                  <span className="text-[11px] text-muted-foreground font-mono">Job Status & ID</span>
                  <div className="font-mono text-foreground font-medium truncate">
                    ID: <span className="text-muted-foreground">{data.id || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Skills section */}
              <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-2">
                <span className="text-[11px] text-muted-foreground font-mono font-semibold">Extracted Skills</span>
                <div className="flex gap-1.5 flex-wrap">
                  {skills.length > 0 ? (
                    skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground italic">No explicit skills listed</span>
                  )}
                </div>
              </div>

              {/* Description preview if present */}
              {data.description && (
                <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1">
                  <span className="text-[11px] text-muted-foreground font-mono font-semibold">Description Preview</span>
                  <p className="text-foreground leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
                    {data.description}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {isJob && (onApprove || onReject || onPublish) && (
          <div className="pt-3 border-t border-border/40 flex items-center justify-end gap-2">
            {status === 'PENDING_REVIEW' && (
              <>
                {onApprove && (
                  <button
                    onClick={() => { onApprove(data.id); onClose(); }}
                    className="h-8 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    Approve
                  </button>
                )}
                {onReject && (
                  <button
                    onClick={() => { onReject(data.id); onClose(); }}
                    className="h-8 px-3 rounded-md border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-foreground text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <XCircleIcon className="w-3.5 h-3.5" />
                    Reject
                  </button>
                )}
              </>
            )}
            {status === 'APPROVED' && onPublish && (
              <button
                onClick={() => { onPublish(data.id); onClose(); }}
                className="h-8 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                Publish Feed
              </button>
            )}
            <button
              onClick={onClose}
              className="h-8 px-3 rounded-md border border-border/80 hover:bg-muted text-xs font-medium text-muted-foreground"
            >
              Close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

