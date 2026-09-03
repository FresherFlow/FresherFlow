'use client';

import { useMemo, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  FunnelIcon,
  ArrowTopRightOnSquareIcon,
  MapPinIcon,
  TrashIcon,
  EyeIcon,
  EllipsisHorizontalIcon,
  PlayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/ui/DropdownMenu';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/ui/Select';
import CompanyLogo from '@/ui/CompanyLogo';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/ui/Dialog';
import { cn } from '@/lib/utils/utils';
import { DiscoveredJob } from '../types';
import { PayloadModal } from '../modals/PayloadModal';
import { toast } from 'react-hot-toast';
import { detectAtsFromUrl } from '../utils';
import { DataGrid, DataGridColumn, DataGridActionsContext } from '@/ui/data-grid/DataGrid';
import { selectionColumn } from '../selectionColumn';
import { StatusBadge, DISCOVERED_STATUS_OPTIONS } from '../statuses';

const ALL = 'ALL';

export function DiscoveredJobsTab() {
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [atsFilter, setAtsFilter] = useState<string>(ALL);
  const [jobs, setJobs] = useState<DiscoveredJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [previewJob, setPreviewJob] = useState<DiscoveredJob | null>(null);

  const [cache, setCache] = useState<Record<string, DiscoveredJob[]>>({});

  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh && cache[statusFilter]) {
        setJobs(cache[statusFilter]);
        setLoading(false);
        return;
      }

      let url = '/api/admin/discovery/jobs?limit=1000';
      if (statusFilter !== ALL) {
        url += `&status=${statusFilter}`;
      }

      setLoading(true);
      try {
        const res = await fetch(url);
        const data = await res.json();
        const fetchedJobs = data.jobs || [];
        setJobs(fetchedJobs);
        setCache(prev => ({ ...prev, [statusFilter]: fetchedJobs }));
      } catch (err) {
        console.error('Failed to fetch discovered jobs:', err);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, cache]
  );

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const uniqueAtsTypes = Array.from(new Set(jobs.map(j => detectAtsFromUrl(j.applyLink || j.apply_link)))).filter(Boolean).sort();

  const filteredJobs = useMemo(() => {
    if (atsFilter === ALL) return jobs;
    return jobs.filter(j => {
      const ats = detectAtsFromUrl(j.applyLink || j.apply_link);
      return ats === atsFilter;
    });
  }, [jobs, atsFilter]);

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

  const handleProcessRequest = async (ids: string[]) => {
    const toastId = toast.loading(`Processing ${ids.length} job(s)...`);
    try {
      const res = await fetch('/api/admin/discovery/jobs/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        toast.success(`Successfully processed ${ids.length} job(s)`, { id: toastId });
        setJobs(prev =>
          prev.map(j => ids.includes(j.id) ? { ...j, status: 'PROCESSED' } : j)
        );
        const newSet = new Set(selectedJobIds);
        ids.forEach(id => newSet.delete(id));
        setSelectedJobIds(newSet);
      } else {
        const error = await res.json();
        toast.error(`Failed to process: ${error.error || 'Unknown error'}`, { id: toastId });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to process jobs', { id: toastId });
    }
  };

  const columns = useMemo<DataGridColumn<DiscoveredJob>[]>(() => {
    return [
      selectionColumn<DiscoveredJob>(),
      {
        id: 'company_title',
        header: 'Company & Title',
        enableSorting: false,
        cell: ({ row }) => {
          const job = row.original;
          return (
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-foreground max-w-[240px] block truncate" title={job.title}>
                {job.title}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <CompanyLogo companyName={job.company} className="w-4 h-4 rounded shrink-0" />
                <span className="text-muted-foreground text-[11px] truncate max-w-[200px]">
                  {job.company}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'location',
        header: 'Location',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[140px]">{row.original.location || 'Not specified'}</span>
          </div>
        ),
      },
      {
        id: 'ats',
        header: 'ATS Type',
        enableSorting: false,
        cell: ({ row }) => {
          const applyUrl = row.original.applyLink || row.original.apply_link || '#';
          return (
            <span className="bg-muted/60 border border-border/40 text-muted-foreground px-2 py-0.5 rounded text-[11px]">
              {detectAtsFromUrl(applyUrl)}
            </span>
          );
        },
      },
      {
        id: 'score',
        header: 'Fresher Score',
        enableSorting: false,
        meta: { cellClassName: 'text-center' },
        cell: ({ row }) => {
          const score = row.original.fresherScore ?? row.original.fresher_score ?? 0;
          return (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-bold border inline-block min-w-[42px]',
                score >= 85
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : score >= 70
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-muted/60 text-muted-foreground border-border/40'
              )}
            >
              {score}%
            </span>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        meta: { cellClassName: 'text-center' },
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'createdAt',
        header: 'Created At',
        enableSorting: false,
        meta: { cellClassName: 'text-right text-muted-foreground' },
        cell: ({ row }) => {
          const createdAtStr = row.original.createdAt || row.original.created_at;
          return createdAtStr
            ? new Date(createdAtStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
            : '-';
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        meta: { cellClassName: 'text-right' },
        cell: ({ row }) => {
          const job = row.original;
          const applyUrl = job.applyLink || job.apply_link || '#';
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer outline-none focus-visible:bg-muted/60 focus-visible:text-foreground">
                  <EllipsisHorizontalIcon className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 text-xs">
                <DropdownMenuItem asChild>
                  <a href={applyUrl} target="_blank" rel="noreferrer" className="flex items-center cursor-pointer w-full">
                    <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" /> Apply Link
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPreviewJob(job)} className="cursor-pointer">
                  <EyeIcon className="w-4 h-4 mr-2" /> Preview JSON
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => handleProcessRequest([job.id])} className="cursor-pointer text-blue-600 dark:text-blue-400 focus:bg-blue-500/10 focus:text-blue-600">
                  <PlayIcon className="w-4 h-4 mr-2" /> Process Job
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => handleDeleteRequest([job.id])} className="cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-500/10 focus:text-red-600">
                  <TrashIcon className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  const handleSelectedRowsChange = useCallback((rows: DiscoveredJob[]) => {
    setSelectedJobIds(new Set(rows.map(r => r.id)));
  }, []);

  const actions = useCallback(
    (ctx: DataGridActionsContext<DiscoveredJob>): ReactNode => {
      const selectedIds = ctx.selectedRows.map(r => r.id);
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <FunnelIcon className="w-4 h-4 text-muted-foreground" />
            <Select value={atsFilter} onValueChange={setAtsFilter}>
              <SelectTrigger className="h-9 text-xs py-1 min-w-[120px] w-auto border-border/80 bg-card cursor-pointer">
                <SelectValue placeholder="All ATS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All ATS</SelectItem>
                {uniqueAtsTypes.map(ats => (
                  <SelectItem key={ats} value={ats}>{ats}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button
            onClick={() => loadData(true)}
            title="Refresh Data"
            className="h-9 px-3 rounded-md bg-card border border-border/80 hover:bg-muted/60 text-muted-foreground hover:text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {ctx.selectedCount > 0 && (
            <>
              <button
                onClick={() => handleProcessRequest(selectedIds)}
                className="h-9 px-3 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <PlayIcon className="w-3.5 h-3.5" />
                Process Selected ({ctx.selectedCount})
              </button>
              <button
                onClick={() => handleDeleteRequest(selectedIds)}
                className="h-9 px-3 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Delete Selected ({ctx.selectedCount})
              </button>
            </>
          )}
        </div>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [atsFilter, uniqueAtsTypes, loadData]
  );

  return (
    <div className="flex flex-col h-full space-y-2 sm:space-y-4 min-h-0">
      <DataGrid<DiscoveredJob>
        data={filteredJobs}
        getRowId={(row) => row.id}
        columns={columns}
        enableSelection
        title="Discovered Jobs Queue"
        count={filteredJobs.length}
        countLabel="jobs"
        description="Raw discovered job postings from ingestion crawlers"
        isLoading={loading && jobs.length === 0}
        searchPlaceholder="Search company, title, location..."
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={[{ value: ALL, label: 'All Status' }, ...DISCOVERED_STATUS_OPTIONS]}
        onClear={() => {
          setAtsFilter(ALL);
          setSelectedJobIds(new Set());
        }}
        actions={actions}
        onSelectedRowsChange={handleSelectedRowsChange}
      />

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
