'use client';

import { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  QueueListIcon,
  ArrowTopRightOnSquareIcon,
  MapPinIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import CompanyLogo from '@/ui/CompanyLogo';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/ui/Dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';
import { cn } from '@/lib/utils/utils';
import { DiscoveredJob } from '../types';
import { PayloadModal } from '../modals/PayloadModal';
import { toast } from 'react-hot-toast';

export function DiscoveredJobsTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [jobs, setJobs] = useState<DiscoveredJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [previewJob, setPreviewJob] = useState<DiscoveredJob | null>(null);

  useEffect(() => {
    let url = '/api/admin/discovery/jobs?limit=100';
    if (statusFilter !== 'ALL') {
      url += `&status=${statusFilter}`;
    }
    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setJobs(d.jobs || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch discovered jobs:', err);
        setLoading(false);
      });
  }, [statusFilter]);

  const filteredJobs = jobs.filter(j => {
    const companyStr = String(j.company || '');
    const titleStr = String(j.title || '');
    const locationStr = String(j.location || '');
    const searchLower = search.toLowerCase().trim();

    if (!searchLower) return true;

    return (
      companyStr.toLowerCase().includes(searchLower) ||
      titleStr.toLowerCase().includes(searchLower) ||
      locationStr.toLowerCase().includes(searchLower)
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
        body: JSON.stringify({ ids, type: 'discovered' }),
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

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <QueueListIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Discovered Jobs Queue</h2>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-mono font-semibold">
                {jobs.length} jobs
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Raw discovered job postings from ingestion crawlers
            </p>
          </div>
        </div>

        {/* Search Bar & Actions */}
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
              placeholder="Search company, title, location..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border/80 bg-card text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Status Filter Chips: ALL | DISCOVERED | PROCESSED */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1 shrink-0 mr-1">
          <FunnelIcon className="w-3 h-3" /> Status:
        </span>
        {['ALL', 'DISCOVERED', 'PROCESSED', 'PROCESSING', 'DUPLICATE', 'REJECTED', 'FAILED'].map(status => (
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
            {status}
          </button>
        ))}
      </div>

      {/* Discovered Jobs Table */}
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
                <TableHead className="py-3 px-4 font-medium">Location</TableHead>
                <TableHead className="py-3 px-4 font-medium">ATS Type</TableHead>
                <TableHead className="py-3 px-4 text-center font-medium">Fresher Score</TableHead>
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
                    <TableCell className="py-3 px-4"><div className="w-20 h-4 bg-muted/60 rounded" /></TableCell>
                    <TableCell className="py-3 px-4"><div className="w-16 h-4 bg-muted/60 rounded" /></TableCell>
                    <TableCell className="py-3 px-4 text-center"><div className="w-12 h-4 bg-muted/60 rounded mx-auto" /></TableCell>
                    <TableCell className="py-3 px-4 text-center"><div className="w-16 h-4 bg-muted/60 rounded mx-auto" /></TableCell>
                    <TableCell className="py-3 px-4 text-right"><div className="w-20 h-4 bg-muted/60 rounded ml-auto" /></TableCell>
                    <TableCell className="py-3 px-4 text-right"><div className="w-28 h-6 bg-muted/60 rounded ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredJobs.map(job => {
                const applyUrl = job.applyLink || job.apply_link || '#';
                const atsType = job.atsType || job.ats_type || 'Custom';
                const score = job.fresherScore ?? job.fresher_score ?? 0;
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
                        <span className="font-semibold text-foreground truncate max-w-[140px]">
                          {job.company}
                        </span>
                      </div>
                    </TableCell>

                    {/* Title */}
                    <TableCell className="py-3 px-4">
                      <span className="font-medium text-foreground max-w-[240px] block truncate" title={job.title}>
                        {job.title}
                      </span>
                    </TableCell>

                    {/* Location */}
                    <TableCell className="py-3 px-4 text-muted-foreground font-sans">
                      <div className="flex items-center gap-1 text-xs">
                        <MapPinIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[140px]">{job.location || 'Not specified'}</span>
                      </div>
                    </TableCell>

                    {/* ATS Type */}
                    <TableCell className="py-3 px-4">
                      <span className="bg-muted/60 border border-border/40 text-muted-foreground px-2 py-0.5 rounded text-[11px] font-mono uppercase">
                        {atsType}
                      </span>
                    </TableCell>

                    {/* Fresher Score */}
                    <TableCell className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-bold border inline-block min-w-[42px]',
                          score >= 85
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                            : score >= 70
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            : 'bg-muted/60 text-muted-foreground border-border/40'
                        )}
                      >
                        {score}%
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-bold border inline-block',
                          job.status === 'PROCESSED'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                            : job.status === 'PROCESSING'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                            : job.status === 'DISCOVERED'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : job.status === 'DUPLICATE'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            : 'bg-red-500/10 text-red-500 border-red-500/30'
                        )}
                      >
                        {job.status}
                      </span>
                    </TableCell>

                    {/* Created At */}
                    <TableCell className="py-3 px-4 text-right text-muted-foreground text-xs font-mono">
                      {formattedDate}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Apply Link Button */}
                        <a
                          href={applyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-md bg-muted/60 border border-border/80 text-foreground hover:bg-muted text-xs font-medium transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                          title="Open Apply Link in new tab"
                        >
                          <span>Apply Link</span>
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        </a>

                        {/* Raw JSON Modal button */}
                        <button
                          onClick={() => setPreviewJob(job)}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          title="Preview Raw JSON Payload"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteRequest([job.id])}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
                          title="Delete Job"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {!loading && filteredJobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="p-8">
                    <div className="py-12 flex flex-col items-center gap-2 text-center border-2 border-dashed border-border/60 rounded-xl text-muted-foreground font-mono text-xs">
                      <QueueListIcon className="w-8 h-8 opacity-50 text-muted-foreground" />
                      <p className="font-semibold text-foreground text-sm">No discovered jobs found</p>
                      <p className="text-muted-foreground">Try adjusting your status filter or search query.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
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

      {/* Payload Modal */}
      <PayloadModal
        open={Boolean(previewJob)}
        data={previewJob}
        onClose={() => setPreviewJob(null)}
        title="Raw Job Payload"
      />
    </div>
  );
}
