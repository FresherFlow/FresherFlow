'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  FunnelIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
  TrashIcon,
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
import { cn } from '@repo/ui/utils/cn';
import { ProcessedJob } from '../types';

export function ProcessedJobsTab() {
  const [jobs, setJobs] = useState<ProcessedJob[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });

  useEffect(() => {
    let url = '/api/admin/discovery/jobs?limit=50&queue=processed';
    if (statusFilter !== 'ALL') {
      url += `&status=${statusFilter}`;
    }
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.jobs) {
          setJobs(data.jobs);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  function handleApprove(id: string) {
    // In a real app this would hit an API endpoint
    setJobs(prev =>
      prev.map(j => (j.id === id ? { ...j, status: 'APPROVED' } : j))
    );
  }

  function handleReject(id: string) {
    // In a real app this would hit an API endpoint
    setJobs(prev =>
      prev.map(j => (j.id === id ? { ...j, status: 'REJECTED' } : j))
    );
  }

  function handlePublish(id: string) {
    // In a real app this would hit an API endpoint
    setJobs(prev =>
      prev.map(j => (j.id === id ? { ...j, status: 'PUBLISHED' } : j))
    );
  }

  const filteredJobs = jobs.filter(j => {
    const titleStr = String(j.title || '');
    const companyStr = String(j.company || '');
    const searchLower = (search || '').toLowerCase();

    return (
      (statusFilter === 'ALL' || j.status === statusFilter) &&
      (titleStr.toLowerCase().includes(searchLower) || companyStr.toLowerCase().includes(searchLower))
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
        setJobs(jobs.filter(j => !ids.includes(j.id)));
        const newSet = new Set(selectedJobIds);
        ids.forEach(id => newSet.delete(id));
        setSelectedJobIds(newSet);
      } else {
        const error = await res.json();
        alert(`Failed to delete: ${error.error}`);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to delete jobs');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-primary" />
            Processed & normalized jobs
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            Jobs structured ready for moderation, approval & publishing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">
            Pending: <strong className="text-amber-500">{jobs.filter(j => j.status === 'PENDING_REVIEW').length}</strong>
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-xs font-mono text-muted-foreground">
            Published: <strong className="text-emerald-500">{jobs.filter(j => j.status === 'PUBLISHED').length}</strong>
          </span>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-between pb-1">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-muted-foreground font-mono flex items-center gap-1 shrink-0 mr-1">
            <FunnelIcon className="w-3 h-3" /> Status:
          </span>
          {['ALL', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors shrink-0 cursor-pointer border',
                statusFilter === status
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-muted-foreground border-border/60 hover:bg-muted/40'
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {selectedJobIds.size > 0 && (
            <button
              onClick={() => handleDeleteRequest(Array.from(selectedJobIds))}
              className="px-3 py-1.5 rounded-md bg-red-500/10 text-foreground hover:bg-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
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
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md shadow-xs">
              <tr className="border-b border-border/60 text-sm font-mono font-semibold tracking-wider text-muted-foreground">
                <th className="py-3 px-4 w-10">
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
                    className="rounded border-border/60"
                  />
                </th>
                <th className="py-3 px-4">Job Title & Company</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Skills Extracted</th>
                <th className="py-3 px-4 text-center">Locations</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">
                    Loading...
                  </td>
                </tr>
              ) : filteredJobs.map(job => (
                <tr key={job.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4">
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
                      className="rounded border-border/60"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <CompanyLogo
                        companyName={job.company}
                        className="w-8 h-8 rounded-md shrink-0"
                      />
                      <div className="min-w-0">
                        <a
                          href={job.applyLink || (job as any).apply_link}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-foreground hover:text-primary hover:underline text-left leading-snug flex items-center gap-1 max-w-[280px] group"
                        >
                          <span className="truncate">{job.title}</span>
                          <ArrowTopRightOnSquareIcon className="w-3 h-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted-foreground truncate max-w-[160px]">{job.company}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-bold border',
                        job.type === 'INTERNSHIP'
                          ? 'bg-purple-500/10 text-foreground border-purple-500/30'
                          : 'bg-blue-500/10 text-foreground border-blue-500/30'
                      )}
                    >
                      {(job.type || 'JOB').charAt(0).toUpperCase() + (job.type || 'JOB').slice(1).toLowerCase().replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td className="py-3 px-4 max-w-xs">
                    <div className="flex gap-1.5 flex-wrap">
                      {job.requiredSkills?.map(skill => (
                        <span
                          key={skill}
                          className="px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 truncate max-w-[120px]"
                        >
                          {skill}
                        </span>
                      ))}
                      {!job.requiredSkills?.length && <span className="text-muted-foreground opacity-50">-</span>}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center font-mono">
                    {job.locations?.join(', ') || '-'}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleDeleteRequest([job.id])}
                        className="p-1.5 rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors inline-flex mr-1"
                        title="Delete Job"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>

                      {job.status === 'PENDING_REVIEW' && (
                        <>
                          <button
                            onClick={() => handleApprove(job.id)}
                            className="h-7 px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all active:scale-[0.96] flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(job.id)}
                            className="h-7 px-2.5 rounded-md border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-foreground text-xs font-semibold transition-all active:scale-[0.96] flex items-center gap-1 cursor-pointer"
                          >
                            <XCircleIcon className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {job.status === 'APPROVED' && (
                        <button
                          onClick={() => handlePublish(job.id)}
                          className="h-7 px-2.5 rounded-md bg-muted/40 border border-border/80 text-foreground hover:bg-muted text-xs font-medium transition-all active:scale-[0.96] flex items-center gap-1 cursor-pointer"
                        >
                          <SparklesIcon className="w-3.5 h-3.5" />
                          <span>Publish Feed</span>
                        </button>
                      )}

                      {(job.status === 'PUBLISHED' || job.status === 'REJECTED') && (
                        <span className="text-xs text-muted-foreground font-mono">No actions</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8">
                    <div className="py-12 flex flex-col items-center gap-2 text-center border-2 border-dashed border-border/60 rounded-xl text-muted-foreground font-mono text-xs">
                      <SparklesIcon className="w-6 h-6 opacity-50" />
                      No processed jobs yet.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, ids: [] })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteDialog.ids.length} job(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <button
              onClick={() => setDeleteDialog({ open: false, ids: [] })}
              className="px-4 py-2 rounded-md text-sm font-medium border border-border/80 hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
