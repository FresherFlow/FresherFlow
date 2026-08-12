'use client';

import { ArrowTopRightOnSquareIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/Dialog';
import { SkillPill } from '@/ui/SkillPill';
import { RunResult, NormalizedJob } from '../types';

interface DryRunModalProps {
 open: boolean;
 result: RunResult | null;
 onClose: () => void;
 onInspectJob: (job: NormalizedJob) => void;
}

export function DryRunModal({ open, result, onClose, onInspectJob }: DryRunModalProps) {
 if (!result) return null;

 return (
 <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
 <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 bg-card border border-border">
 <DialogHeader>
 <DialogTitle className="text-sm font-bold flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span>Dry Run Preview — {result.company}</span>
 <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded border border-border/40">
 {result.ats}
 </span>
 </div>
 <span className="text-xs text-muted-foreground font-normal">
 {result.jobs?.length ?? 0} jobs previewed (read-only)
 </span>
 </DialogTitle>
 </DialogHeader>

 <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-2">
 {!result.jobs || result.jobs.length === 0 ? (
 <div className="p-8 text-center border border-dashed border-border rounded-xl">
 <p className="text-xs text-muted-foreground">No jobs extracted in dry run.</p>
 </div>
 ) : (
 result.jobs.map((job, idx) => (
 <div
 key={idx}
 className="p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col gap-2 transition-colors hover:border-border"
 >
 <div className="flex items-start justify-between gap-2">
 <div>
 <h4 className="text-sm font-bold text-foreground">{job.title}</h4>
 <p className="text-xs text-muted-foreground mt-0.5">{job.company}</p>
 </div>
 {job.work_mode && (
 <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded border border-border/40">
 {job.work_mode}
 </span>
 )}
 </div>

 <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
 {job.locations?.length > 0 && <span>📍 {job.locations.join(', ')}</span>}
 {(job.experience_min !== undefined || job.experience_max !== undefined) && (
 <span>
 💼 {job.experience_min}–{job.experience_max} yrs
 </span>
 )}
 {job.salary_range && <span>💰 {job.salary_range}</span>}
 </div>

 {job.required_skills?.length > 0 && (
 <div className="flex flex-wrap gap-1 mt-1">
 {job.required_skills.slice(0, 6).map((skill, sIdx) => (
 <SkillPill
 key={sIdx}
 skill={skill}
 className="rounded-md bg-muted/60 text-[10px] text-muted-foreground border border-border/30"
 />
 ))}
 </div>
 )}

 <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs mt-1">
 {job.apply_link ? (
 <a
 href={job.apply_link}
 target="_blank"
 rel="noopener noreferrer"
 className="text-primary hover:underline flex items-center gap-1"
 >
 <span>Apply Link</span>
 <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
 </a>
 ) : (
 <span className="text-muted-foreground">No link</span>
 )}

 <button
 onClick={() => onInspectJob(job)}
 className="text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
 >
 <CodeBracketIcon className="w-3.5 h-3.5" />
 <span>View JSON</span>
 </button>
 </div>
 </div>
 ))
 )}
 </div>
 </DialogContent>
 </Dialog>
 );
}

