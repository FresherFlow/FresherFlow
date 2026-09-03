"use client";

import { useMemo, useState, useEffect, useCallback, ReactNode } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  EyeIcon,
  CloudArrowUpIcon,
  ClipboardDocumentIcon,
  EllipsisHorizontalIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/ui/DropdownMenu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/ui/Select";
import { detectAtsFromUrl } from "../utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/ui/Dialog";
import { cn } from "@/lib/utils/utils";
import { ProcessedJob } from "../types";
import { toast } from "react-hot-toast";
import { DataGrid, DataGridColumn, DataGridActionsContext } from "@/ui/data-grid/DataGrid";
import { selectionColumn } from "../selectionColumn";
import { StatusCell, PROCESSED_STATUS_OPTIONS } from "../statuses";

const ALL = "ALL";

export function ProcessedJobsTab() {
  const [jobs, setJobs] = useState<ProcessedJob[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [atsFilter, setAtsFilter] = useState<string>(ALL);
  const [loading, setLoading] = useState(true);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [verifyModalJob, setVerifyModalJob] = useState<ProcessedJob | null>(null);

  const [cache, setCache] = useState<Record<string, ProcessedJob[]>>({});

  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh && cache[statusFilter]) {
        setJobs(cache[statusFilter]);
        setLoading(false);
        return;
      }

      let url = "/api/admin/discovery/jobs/processed?limit=1000";
      if (statusFilter !== ALL) {
        url += `&status=${statusFilter}`;
      }

      setLoading(true);
      try {
        const res = await fetch(url);
        const data = await res.json();
        const fetchedJobs = data.jobs || [];
        setJobs(fetchedJobs);
        setCache((prev) => ({ ...prev, [statusFilter]: fetchedJobs }));
      } catch (err) {
        console.error("Failed to fetch processed jobs:", err);
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

  const handlePushSelected = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const res = await fetch("/api/admin/discovery/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const { pushed, failed, successfulIds = [], failedIds = [] } = await res.json();
        setJobs((prev) =>
          prev.map((j) => {
            if (j.id && successfulIds.includes(j.id)) return { ...j, status: "PUBLISHED" };
            if (j.id && failedIds.includes(j.id)) return { ...j, status: "REJECTED" };
            return j;
          })
        );

        const newSet = new Set(selectedJobIds);
        successfulIds.forEach((id: string) => newSet.delete(id));
        failedIds.forEach((id: string) => newSet.delete(id));
        setSelectedJobIds(newSet);

        if (failed > 0) {
          toast.success(`${pushed} jobs pushed, but ${failed} failed validation.`);
        } else {
          toast.success(`${pushed} jobs pushed to DB`);
        }
      } else {
        const error = await res.json();
        toast.error(`Failed to push: ${error.error || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to push jobs");
    }
  };

  async function handleApprove(id: string) {
    try {
      const res = await fetch("/api/admin/discovery/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      if (res.ok) {
        setJobs((prev) =>
          prev.map((j) => (j.id === id ? { ...j, status: "PUBLISHED" } : j))
        );
        toast.success("Job approved and published to live feed");
      } else {
        toast.error("Failed to publish job");
      }
    } catch {
      toast.error("Network error approving job");
    }
  }

  async function handleReject(id: string) {
    try {
      const res = await fetch(`/api/admin/discovery/jobs/processed?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "REJECTED" }),
      });
      if (res.ok) {
        setJobs((prev) =>
          prev.map((j) => (j.id === id ? { ...j, status: "REJECTED" } : j))
        );
        toast.success("Job rejected");
      }
    } catch {
      toast.error("Failed to reject job");
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      const res = await fetch(`/api/admin/discovery/jobs/processed?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setJobs((prev) =>
          prev.map((j) => (j.id === id ? { ...j, status } : j))
        );
        toast.success(`Status updated to ${status.replace(/_/g, " ").toLowerCase()}`);
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  }

  const handleDeleteRequest = (ids: string[]) => {
    setDeleteDialog({ open: true, ids });
  };

  const confirmDelete = async () => {
    const ids = deleteDialog.ids;
    setDeleteDialog({ open: false, ids: [] });
    try {
      const res = await fetch("/api/admin/discovery/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, type: "processed" }),
      });
      if (res.ok) {
        setJobs((prev) => prev.filter((j) => !ids.includes(j.id)));
        const newSet = new Set(selectedJobIds);
        ids.forEach((id) => newSet.delete(id));
        setSelectedJobIds(newSet);
        toast.success("Jobs deleted successfully");
      } else {
        const error = await res.json();
        toast.error(`Failed to delete: ${error.error || "Unknown error"}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete jobs");
    }
  };

  const copyJobJson = (job: ProcessedJob) => {
    navigator.clipboard.writeText(JSON.stringify(job, null, 2));
    toast.success("Job JSON copied to clipboard");
  };

  const formatExperience = (job: ProcessedJob) => {
    const min = job.experienceMin ?? job.experience_min;
    const max = job.experienceMax ?? job.experience_max;
    if (min === null || min === undefined) return max !== null && max !== undefined ? `Up to ${max} yrs` : "–";
    if (min !== undefined && max !== undefined) {
      if (min === max) return `${min} yrs`;
      return `${min} - ${max} yrs`;
    }
    if (min !== undefined) return `${min}+ yrs`;
    return `Up to ${max} yrs`;
  };

  const columns = useMemo<DataGridColumn<ProcessedJob>[]>(() => {
    return [
      selectionColumn<ProcessedJob>(),
      {
        id: "company_title",
        accessorFn: (row) => row.title || "",
        header: "Job",
        enableSorting: true,
        cell: ({ row }) => {
          const job = row.original;
          return (
            <div className="flex flex-col gap-1.5">
              <span className="font-semibold text-foreground max-w-[220px] block truncate" title={job.title}>
                {job.title}
              </span>
              <div className="flex items-center min-w-0">
                <span className="text-muted-foreground text-[11px] truncate max-w-[200px]">{job.company}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: "ats",
        accessorFn: (row) => detectAtsFromUrl(row.applyLink || row.apply_link || ""),
        header: "ATS",
        enableSorting: true,
        cell: ({ row }) => {
          const job = row.original;
          const applyUrl = job.applyLink || job.apply_link || "#";
          return (
            <span className="bg-muted/60 border border-border/40 text-muted-foreground px-2 py-0.5 rounded text-[11px]">
              {detectAtsFromUrl(applyUrl)}
            </span>
          );
        },
      },
      {
        id: "type",
        accessorFn: (row) => row.type || "JOB",
        header: "Type",
        enableSorting: true,
        cell: ({ row }) => {
          const jobType = row.original.type || "JOB";
          return (
            <span
              className={cn(
                "px-2 py-0.5 rounded text-[11px] font-bold border inline-block ",
                jobType === "INTERNSHIP"
                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
              )}
            >
              {jobType}
            </span>
          );
        },
      },
      {
        id: "workMode",
        accessorFn: (row) => row.workMode || row.work_mode || "",
        header: "Mode",
        enableSorting: true,
        cell: ({ row }) => {
          const workMode = row.original.workMode || row.original.work_mode || "-";
          return (
            <span className="bg-muted/60 border border-border/40 text-muted-foreground px-2 py-0.5 rounded text-[11px]">
              {workMode}
            </span>
          );
        },
      },
      {
        id: "experience",
        accessorFn: (row) => row.experienceMin ?? row.experience_min ?? row.experienceMax ?? row.experience_max ?? 0,
        header: "Exp",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatExperience(row.original)}</span>
        ),
      },
      {
        id: "skills",
        header: "Skills",
        enableSorting: false,
        cell: ({ row }) => {
          const skills = row.original.requiredSkills || row.original.required_skills || [];
          const first3Skills = skills.slice(0, 3);
          const extraSkillsCount = skills.length - 3;
          return (
            <div className="flex gap-1 flex-nowrap items-center overflow-hidden max-w-[200px]">
              {first3Skills.map((skill) => (
                <span key={skill} className="px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 text-[11px] truncate max-w-[100px]">
                  {skill}
                </span>
              ))}
              {extraSkillsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground/80 text-[10px]">
                  +{extraSkillsCount}
                </span>
              )}
              {skills.length === 0 && <span className="text-muted-foreground opacity-50">-</span>}
            </div>
          );
        },
      },
      {
        id: "status",
        accessorFn: (row) => row.status || "DRAFT",
        header: "Status",
        enableSorting: true,
        meta: { cellClassName: "text-center" },
        cell: ({ row }) => (
          <StatusCell
            value={row.original.status || "DRAFT"}
            options={PROCESSED_STATUS_OPTIONS}
            onChange={(next) => handleStatusChange(row.original.id, next)}
          />
        ),
      },
      {
        id: "createdAt",
        accessorFn: (row) => {
          const value = row.createdAt || row.created_at;
          return value ? new Date(value).getTime() : 0;
        },
        header: "Created",
        enableSorting: true,
        meta: { cellClassName: "text-right text-muted-foreground" },
        cell: ({ row }) => {
          const createdAtStr = row.original.createdAt || row.original.created_at;
          return createdAtStr
            ? new Date(createdAtStr).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
            : "-";
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { cellClassName: "text-right" },
        cell: ({ row }) => {
          const job = row.original;
          const applyUrl = job.applyLink || job.apply_link || "#";
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer focus:outline-none focus-visible:bg-muted/60 focus-visible:text-foreground">
                  <EllipsisHorizontalIcon className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 text-xs">
                <DropdownMenuItem asChild>
                  <a href={applyUrl} target="_blank" rel="noreferrer" className="flex items-center cursor-pointer w-full">
                    <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" /> Apply Link
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setVerifyModalJob(job)} className="cursor-pointer">
                  <EyeIcon className="w-4 h-4 mr-2" /> Preview JSON
                </DropdownMenuItem>

                {job.status === "PENDING_REVIEW" && (
                  <>
                    <DropdownMenuItem onClick={() => handleApprove(job.id)} className="cursor-pointer text-emerald-600 dark:text-emerald-400">
                      <CheckCircleIcon className="w-4 h-4 mr-2" /> Approve & Publish
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleReject(job.id)} className="cursor-pointer text-red-600 dark:text-red-400">
                      <XCircleIcon className="w-4 h-4 mr-2" /> Reject
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />

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

  const uniqueAtsTypes = Array.from(
    new Set(jobs.map((j) => detectAtsFromUrl(j.applyLink || j.apply_link)))
  )
    .filter(Boolean)
    .sort();

  const filteredJobs = useMemo(() => {
    if (atsFilter === ALL) return jobs;
    return jobs.filter((j) => {
      const ats = detectAtsFromUrl(j.applyLink || j.apply_link);
      return ats === atsFilter;
    });
  }, [jobs, atsFilter]);

  const handleSelectedRowsChange = useCallback((rows: ProcessedJob[]) => {
    setSelectedJobIds(new Set(rows.map((r) => r.id)));
  }, []);

  const actions = useCallback(
    (ctx: DataGridActionsContext<ProcessedJob>): ReactNode => {
      const selectedIds = ctx.selectedRows.map((r) => r.id);
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Select value={atsFilter} onValueChange={setAtsFilter}>
              <SelectTrigger className="h-9 text-xs py-1 min-w-[120px] w-auto border-border/80 bg-card cursor-pointer">
                <SelectValue placeholder="All ATS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All ATS</SelectItem>
                {uniqueAtsTypes.map((ats) => (
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
                onClick={() => handlePushSelected(selectedIds)}
                className="h-9 px-3 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <CloudArrowUpIcon className="w-3.5 h-3.5" />
                Push to DB ({ctx.selectedCount})
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
      <DataGrid<ProcessedJob>
        data={filteredJobs}
        getRowId={(row) => row.id}
        columns={columns}
        enableSelection
        title="Processed Jobs"
        count={filteredJobs.length}
        countLabel="jobs"
        isLoading={loading && jobs.length === 0}
        searchPlaceholder="Search processed jobs…"
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={[{ value: ALL, label: "All Status" }, ...PROCESSED_STATUS_OPTIONS]}
        onClear={() => {
          setAtsFilter(ALL);
          setSelectedJobIds(new Set());
        }}
        actions={actions}
        onSelectedRowsChange={handleSelectedRowsChange}
      />

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
            <button onClick={() => setDeleteDialog({ open: false, ids: [] })} className="px-4 py-2 rounded-md text-sm font-medium border border-border/80 hover:bg-muted text-foreground cursor-pointer">
              Cancel
            </button>
            <button onClick={confirmDelete} className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 cursor-pointer">
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
              <EyeIcon className="w-5 h-5 text-primary" />
              Preview Processed Job Payload — {verifyModalJob?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Job ID: {verifyModalJob?.id} · Company: {verifyModalJob?.company}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto my-3">
            <div className="relative">
              <button
                onClick={() => verifyModalJob && copyJobJson(verifyModalJob)}
                className="absolute top-2 right-2 px-2.5 py-1 rounded bg-muted/80 border border-border/80 text-foreground hover:bg-muted text-xs flex items-center gap-1 z-10 cursor-pointer"
              >
                <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                Copy JSON
              </button>
              <pre className="p-4 rounded-xl bg-muted/30 border border-border/60 text-xs overflow-x-auto text-foreground leading-relaxed">
                <code>{verifyModalJob ? JSON.stringify(verifyModalJob, null, 2) : ""}</code>
              </pre>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button onClick={() => verifyModalJob && copyJobJson(verifyModalJob)} className="px-4 py-2 rounded-md text-sm font-medium border border-border/80 hover:bg-muted text-foreground flex items-center gap-1.5 cursor-pointer">
              <ClipboardDocumentIcon className="w-3.5 h-3.5" />
              Copy JSON
            </button>
            <button onClick={() => setVerifyModalJob(null)} className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
