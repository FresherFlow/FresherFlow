'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  EyeIcon,
  CloudArrowUpIcon,
  CheckBadgeIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import CompanyLogo from '@/ui/CompanyLogo';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/ui/Dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/ui/Table';
import { cn } from '@/lib/utils/utils';
import { ProcessedJob } from '../types';
import { toast } from 'react-hot-toast';

export function ProcessedJobsTab() {
  const [jobs, setJobs] = useState<ProcessedJob[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [verifyModalJob, setVerifyModalJob] = useState<ProcessedJob | null>(null);

  useEffect(() => {
    let url = '/api/admin/discovery/jobs/processed?limit=100';
    if (statusFilter !== 'ALL') {
      url += `&status=${statusFilter}`;
    }
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setJobs(data.jobs || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch processed jobs:', err);
        setLoading(false);
      });
  }, [statusFilter]);

  const handlePushToMainDb = async () => {
    toast.success('Coming soon');
    try {
      await fetch('/api/admin/discovery/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // Ignore if endpoint does not exist yet
    }
  };

  function handleApprove(id: string) {
    setJobs(prev =>
      prev.map(j => (j.id === id ? { ...j, status: 'APPROVED' } : j))
    );
    toast.success('Job approved');
  }

  function handleReject(id: string) {
    setJobs(prev =>
      prev.map(j => (j.id === id ? { ...j, status: 'REJECTED' } : j))
    );
    toast.success('Job rejected');
  }

  function handlePublish(id: string) {
    setJobs(prev =>
      prev.map(j => (j.id === id ? { ...j, status: 'PUBLISHED' } : j))
    );
    toast.success('Job published to feed');
  }

  const filteredJobs = jobs.filter(j => {
    const titleStr = String(j.title || '');
    const companyStr = String(j.company || '');
    const searchLower = search.toLowerCase().trim();

    if (!searchLower) return true;

    return (
      titleStr.toLowerCase().includes(searchLower) ||
      companyStr.toLowerCase().includes(searchLower)
    );
  });

  const handleDeleteRequest = (ids: string[]) => {
    setDeleteDialog({ open: true, ids });
  };

  const confirmDelete = async () => {
    const ids = deleteDialog.ids;
    setDeleteDialog({ open: false, ids: [] });
    try {
      const res = await fetch('/api/admin/discovery/jobs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, type: 'processed' }),
      });
      if (res.ok) {
        setJobs(prev => prev.filter(j => !ids.includes(j.id)));
        const newSet = new Set(selectedJobIds);
        ids.forEach(id => newSet.delete(id));
        setSelectedJobIds(newSet);
        toast.success('Jobs deleted successfully');
      } else {
        const error = await res.json();
        toast.error(`Failed to delete: ${error.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete jobs');
    }
  };

  const formatExperience = (job: ProcessedJob) => {
    const min = job.experienceMin ?? job.experience_min;
    const max = job.experienceMax ?? job.experience_max;
    if (min === undefined && max === undefined) return '0 - 2 yrs';
    if (min !== undefined && max !== undefined) {
      if (min === max) return `${min} yrs`;
      return `${min} - ${max} yrs`;
    }
    if (min !== undefined) return `${min}+ yrs`;
    return `Up to ${max} yrs`;
  };

  const copyJobJson = (job: ProcessedJob) => {
    navigator.clipboard.writeText(JSON.stringify(job, null, 2));
    toast.success('Job JSON copied to clipboard');
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Processed & Normalized Jobs</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-mono font-semibold">
                {jobs.length} processed jobs
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Jobs normalized ready for moderation, review & main database push
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Push to Main DB Button */}
          <button
            onClick={handlePushToMainDb}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <CloudArrowUpIcon className="w-4 h-4" />
            <span>Push to Main DB</span>
          </button>
        </div>
      </div>

      {/* Status Filters: ALL | PUBLISHED | PENDING_REVIEW */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-between pb-1">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-muted-foreground font-mono flex items-center gap-1 shrink-0 mr-1">
            <FunnelIcon className="w-3 h-3" /> Status:
          </span>
          {['ALL', 'PUBLISHED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors shrink-0 cursor-pointer border',
                statusFilter === status
                  ? 'bg-foreground text-background border-foreground font-semibold'
                  : 'bg-card text-muted-foreground border-border/60 hover:bg-muted/40'
              )}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {selectedJobIds.size > 0 && (
            <button
              onClick={() => handleDeleteRequest(Array.from(selectedJobIds))}
              className="px-3 py-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              Delete Selected ({selectedJobIds.size})
            </button>
          )}
          <div className="relative w-full sm:w-72">
            <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search processed jobs..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border/80 bg-card text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table className="w-full text-left border-collapse">
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md shadow-xs">
              <TableRow className="border-b border-border/60 text-xs font-mono font-semibold tracking-wider text-muted-foreground">
                <TableHead className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={filteredJobs.length > 0 && selectedJobIds.size === filteredJobs.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedJobIds(new Set(filteredJobs.map(j => j.id)));
                      } else {
                        setSelectedJobIds(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded border-border/80 bg-card text-primary focus:ring-1 focus:ring-primary focus:ring-offset-0 accent-primary cursor-pointer transition-colors"
                  />
                </TableHead>
                <TableHead className="py-3 px-4 font-medium">Company</TableHead>
                <TableHead className="py-3 px-4 font-medium">Title</TableHead>
                <TableHead className="py-3 px-4 font-medium">Type</TableHead>
                <TableHead className="py-3 px-4 font-medium">Work Mode</TableHead>
                <TableHead className="py-3 px-4 font-medium">Exp (min-max)</TableHead>
                <TableHead className="py-3 px-4 font-medium">Skills (first 3)</TableHead>
                <TableHead className="py-3 px-4 text-center font-medium">Status</TableHead>
                <TableHead className="py-3 px-4 text-right font-medium">Created At</TableHead>
                <TableHead className="py-3 px-4 text-right font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/40 text-xs font-mono">
              {loading ? (
                // Loading Skeleton Rows
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell className="py-3 px-4"><div className="w-4 h-4 bg-muted/60 rounded" /></TableCell>
                    <TableCell className="py-3 px-4"><div className="w-24 h-4 bg-muted/60 rounded" /></TableCell>
                    <TableCell className="py-3 px-4"><div className="w-36 h-4 bg-muted/60 rounded" /></TableCell>
                    <TableCell className="py-3 px-4"><div className="w-16 h-4 bg-muted/60 rounded" /></TableCell>
                    <TableCell className="py-3 px-4"><div className="w-16 h-4 bg-muted/60 rounded" /></TableCell>
                    <TableCell className="py-3 px-4"><div className="w-16 h-4 bg-muted/60 rounded" /></TableCell>
                    <TableCell className="py-3 px-4"><div className="w-32 h-4 bg-muted/60 rounded" /></TableCell>
                    <TableCell className="py-3 px-4 text-center"><div className="w-20 h-4 bg-muted/60 rounded mx-auto" /></TableCell>
                    <TableCell className="py-3 px-4 text-right"><div className="w-20 h-4 bg-muted/60 rounded ml-auto" /></TableCell>
                    <TableCell className="py-3 px-4 text-right"><div className="w-28 h-6 bg-muted/60 rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredJobs.map(job => {
                const jobType = job.type || 'JOB';
                const workMode = job.workMode || job.work_mode || '-';
                const skills = job.requiredSkills || job.required_skills || [];
                const first3Skills = skills.slice(0, 3);
                const extraSkillsCount = skills.length - 3;
                const createdAtStr = job.createdAt || job.created_at;
                const formattedDate = createdAtStr ? new Date(createdAtStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-';

                return (
                  <TableRow key={job.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={selectedJobIds.has(job.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedJobIds);
                          if (e.target.checked) {
                            newSet.add(job.id);
                          } else {
                            newSet.delete(job.id);
                          }
                          setSelectedJobIds(newSet);
                        }}
                        className="w-4 h-4 rounded border-border/80 bg-card text-primary focus:ring-1 focus:ring-primary focus:ring-offset-0 accent-primary cursor-pointer transition-colors"
                      />
                    </TableCell>

                    {/* Company */}
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CompanyLogo
                          companyName={job.company}
                          className="w-7 h-7 rounded-md shrink-0"
                        />
                        <span className="font-semibold text-foreground truncate max-w-[130px]">
                          {job.company}
                        </span>
                      </div>
                    </TableCell>

                    {/* Title */}
                    <TableCell className="py-3 px-4">
                      <span className="font-medium text-foreground max-w-[220px] block truncate" title={job.title}>
                        {job.title}
                      </span>
                    </TableCell>

                    {/* Type */}
                    <TableCell className="py-3 px-4 font-mono">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-bold border inline-block uppercase',
                          jobType === 'INTERNSHIP'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        )}
                      >
                        {jobType}
                      </span>
                    </TableCell>

                    {/* Work Mode */}
                    <TableCell className="py-3 px-4 font-mono">
                      <span className="bg-muted/60 border border-border/40 text-muted-foreground px-2 py-0.5 rounded text-[11px] uppercase">
                        {workMode}
                      </span>
                    </TableCell>

                    {/* Experience min-max */}
                    <TableCell className="py-3 px-4 font-mono text-muted-foreground">
                      {formatExperience(job)}
                    </TableCell>

                    {/* Skills (first 3 as badges) */}
                    <TableCell className="py-3 px-4 max-w-[200px]">
                      <div className="flex gap-1.5 flex-wrap items-center">
                        {first3Skills.map(skill => (
                          <span
                            key={skill}
                            className="px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 text-[11px] truncate max-w-[100px]"
                          >
                            {skill}
                          </span>
                        ))}
                        {extraSkillsCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground/80 text-[10px] font-mono">
                            +{extraSkillsCount}
                          </span>
                        )}
                        {skills.length === 0 && <span className="text-muted-foreground opacity-50">-</span>}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-bold border inline-block',
                          job.status === 'PUBLISHED'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                            : job.status === 'PENDING_REVIEW'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            : job.status === 'APPROVED'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                            : 'bg-red-500/10 text-red-500 border-red-500/30'
                        )}
                      >
                        {job.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>

                    {/* Created At */}
                    <TableCell className="py-3 px-4 text-right text-muted-foreground text-xs font-mono">
                      {formattedDate}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Verify Button (shows modal with full JSON of that job) */}
                        <button
                          onClick={() => setVerifyModalJob(job)}
                          className="px-2.5 py-1 rounded-md bg-muted/60 border border-border/80 text-foreground hover:bg-muted text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                          title="Verify full JSON payload"
                        >
                          <CheckBadgeIcon className="w-3.5 h-3.5 text-primary" />
                          <span>Verify</span>
                        </button>

                        <button
                          onClick={() => handleDeleteRequest([job.id])}
                          className="p-1 rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
                          title="Delete Job"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>

                        {job.status === 'PENDING_REVIEW' && (
                          <>
                            <button
                              onClick={() => handleApprove(job.id)}
                              className="h-7 px-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all active:scale-[0.96] flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircleIcon className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReject(job.id)}
                              className="h-7 px-2 rounded-md border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-all active:scale-[0.96] flex items-center gap-1 cursor-pointer"
                            >
                              <XCircleIcon className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {job.status === 'APPROVED' && (
                          <button
                            onClick={() => handlePublish(job.id)}
                            className="h-7 px-2 rounded-md bg-muted/40 border border-border/80 text-foreground hover:bg-muted text-xs font-medium transition-all active:scale-[0.96] flex items-center gap-1 cursor-pointer"
                          >
                            <SparklesIcon className="w-3.5 h-3.5" />
                            <span>Publish</span>
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!loading && filteredJobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="p-8">
                    <div className="py-12 flex flex-col items-center gap-2 text-center border-2 border-dashed border-border/60 rounded-xl text-muted-foreground font-mono text-xs">
                      <SparklesIcon className="w-8 h-8 opacity-50 text-muted-foreground" />
                      <p className="font-semibold text-foreground text-sm">No processed jobs found</p>
                      <p className="text-muted-foreground">Try adjusting your status filter or search query.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, ids: [] })}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete {deleteDialog.ids.length} job(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <button
              onClick={() => setDeleteDialog({ open: false, ids: [] })}
              className="px-4 py-2 rounded-md text-sm font-medium border border-border/80 hover:bg-muted text-foreground cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 cursor-pointer"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Modal (shows full JSON of the job) */}
      <Dialog open={Boolean(verifyModalJob)} onOpenChange={(open) => !open && setVerifyModalJob(null)}>
        <DialogContent className="bg-card border-border text-foreground max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CheckBadgeIcon className="w-5 h-5 text-primary" />
              Verify Processed Job Payload — {verifyModalJob?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              Job ID: {verifyModalJob?.id} · Company: {verifyModalJob?.company}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto my-3">
            <div className="relative">
              <button
                onClick={() => verifyModalJob && copyJobJson(verifyModalJob)}
                className="absolute top-2 right-2 px-2.5 py-1 rounded bg-muted/80 border border-border/80 text-foreground hover:bg-muted text-xs font-mono flex items-center gap-1 z-10 cursor-pointer"
              >
                <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                Copy JSON
              </button>
              <pre className="p-4 rounded-xl bg-muted/30 border border-border/60 text-xs font-mono overflow-x-auto text-foreground leading-relaxed">
                <code>{verifyModalJob ? JSON.stringify(verifyModalJob, null, 2) : ''}</code>
              </pre>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              onClick={() => verifyModalJob && copyJobJson(verifyModalJob)}
              className="px-4 py-2 rounded-md text-sm font-medium border border-border/80 hover:bg-muted text-foreground flex items-center gap-1.5 cursor-pointer"
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
              Copy JSON
            </button>
            <button
              onClick={() => setVerifyModalJob(null)}
              className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
