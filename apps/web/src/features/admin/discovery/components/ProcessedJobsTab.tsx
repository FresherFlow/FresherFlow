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
 EllipsisHorizontalIcon,
 ArrowTopRightOnSquareIcon,
 ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/ui/DropdownMenu';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/ui/Select';
import { detectAtsFromUrl } from '../utils';
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
import { PaginationControls } from '@/ui/data-table/DataTablePagination';

export function ProcessedJobsTab() {
 const [jobs, setJobs] = useState<ProcessedJob[]>([]);
 const [statusFilter, setStatusFilter] = useState<string>('ALL');
 const [atsFilter, setAtsFilter] = useState<string>('ALL');
 const [search, setSearch] = useState('');
 const [loading, setLoading] = useState(true);
 const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
 const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
 const [verifyModalJob, setVerifyModalJob] = useState<ProcessedJob | null>(null);

 const [pageIndex, setPageIndex] = useState(0);
 const [pageSize, setPageSize] = useState(20);

 const [cache, setCache] = useState<Record<string, ProcessedJob[]>>({});

 useEffect(() => {
   setPageIndex(0);
 }, [search, statusFilter, atsFilter]);

  const loadData = async (forceRefresh = false) => {
    if (!forceRefresh && cache[statusFilter]) {
      setJobs(cache[statusFilter]);
      setLoading(false);
      return;
    }

    let url = '/api/admin/discovery/jobs/processed?limit=1000';
    if (statusFilter !== 'ALL') {
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
      console.error('Failed to fetch processed jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handlePushSelected = async () => {
    const ids = Array.from(selectedJobIds);
    try {
      const res = await fetch('/api/admin/discovery/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const { pushed, failed, successfulIds = [], failedIds = [] } = await res.json();
        setJobs(prev => prev.map(j => {
          if (j.id && successfulIds.includes(j.id)) return { ...j, status: 'PUBLISHED' };
          if (j.id && failedIds.includes(j.id)) return { ...j, status: 'REJECTED' };
          return j;
        }));
        
        // Remove successful and failed ones from the selected set
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
        toast.error(`Failed to push: ${error.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to push jobs');
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

 const uniqueAtsTypes = Array.from(new Set(jobs.map(j => detectAtsFromUrl(j.applyLink || j.apply_link)))).filter(Boolean).sort();

 const filteredJobs = jobs.filter(j => {
  if (atsFilter !== 'ALL') {
    const ats = detectAtsFromUrl(j.applyLink || j.apply_link);
    if (ats !== atsFilter) return false;
  }
 const titleStr = String(j.title || '');
 const companyStr = String(j.company || '');
 const searchLower = search.toLowerCase().trim();

 if (!searchLower) return true;

 return (
 titleStr.toLowerCase().includes(searchLower) ||
 companyStr.toLowerCase().includes(searchLower)
 );
 });

 const paginatedJobs = filteredJobs.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

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
 if (min === null || min === undefined) return max !== null && max !== undefined ? `Up to ${max} yrs` : '–';
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
 <div className="flex flex-col h-full space-y-2 sm:space-y-4 min-h-0">
 {/* Header Bar */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 border-b-0 sm:border-b border-border/60 pb-0 sm:pb-3">
 <div className="hidden md:flex items-center gap-3">
 <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
 <SparklesIcon className="w-5 h-5" />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h2 className="text-base font-bold text-foreground">Processed & Normalized Jobs</h2>
 <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
 {jobs.length} processed jobs
 </span>
 </div>
 <p className="hidden md:block text-xs text-muted-foreground mt-0.5">
 Jobs normalized ready for moderation, review & main database push
 </p>
 </div>
 </div>
  </div>

 {/* Status Filters & Search */}
 <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-between pb-1">
   {/* Left Side: Search & Delete */}
   <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
     <div className="relative w-full sm:w-72">
       <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
       <input
         type="text"
         value={search}
         onChange={e => setSearch(e.target.value)}
         placeholder="Search processed jobs..."
         className="w-full pl-9 pr-3 py-1.5 h-10 rounded-lg border border-border/80 bg-card text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus-visible:bg-muted/60 focus-visible:text-foreground"
       />
     </div>
      {selectedJobIds.size > 0 && (
        <>
          <button
            onClick={handlePushSelected}
            className="h-10 px-3 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <CloudArrowUpIcon className="w-3.5 h-3.5" />
            Push to DB ({selectedJobIds.size})
          </button>
          <button
            onClick={() => handleDeleteRequest(Array.from(selectedJobIds))}
            className="h-10 px-3 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            Delete Selected ({selectedJobIds.size})
          </button>
        </>
      )}
   </div>

   {/* Right Side: Filters & Refresh */}
   <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
     <div className="flex items-center gap-2 shrink-0">
       <button
         onClick={() => loadData(true)}
         title="Refresh Data"
         className="h-10 px-3 rounded-md bg-card border border-border/80 hover:bg-muted/60 text-muted-foreground hover:text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
       >
         <ArrowPathIcon className="w-4 h-4" />
         <span className="hidden sm:inline">Refresh</span>
       </button>
       <FunnelIcon className="w-4 h-4 text-muted-foreground ml-1" />
        <Select value={atsFilter} onValueChange={setAtsFilter}>
          <SelectTrigger className="h-10 text-xs py-1 min-w-[120px] w-auto border-border/80 bg-card focus:outline-none focus-visible:bg-muted/60 focus-visible:text-foreground cursor-pointer">
            <SelectValue placeholder="All ATS" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All ATS</SelectItem>
            {uniqueAtsTypes.map(ats => (
              <SelectItem key={ats} value={ats}>{ats}</SelectItem>
            ))}
          </SelectContent>
        </Select>
       <Select value={statusFilter} onValueChange={setStatusFilter}>
         <SelectTrigger className="h-10 text-xs py-1 min-w-[140px] w-auto border-border/80 bg-card focus:outline-none focus-visible:bg-muted/60 focus-visible:text-foreground cursor-pointer">
           <SelectValue placeholder="All Status" />
         </SelectTrigger>
         <SelectContent>
           <SelectItem value="ALL">All Status</SelectItem>
           <SelectItem value="PUBLISHED">Published</SelectItem>
           <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
           <SelectItem value="APPROVED">Approved</SelectItem>
           <SelectItem value="REJECTED">Rejected</SelectItem>
           <SelectItem value="EXPIRED">Expired</SelectItem>
         </SelectContent>
       </Select>
     </div>
   </div>
 </div>

 {/* Table */}
 <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden shadow-xs flex flex-col flex-1 min-h-0">
 <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
 <Table className="w-full text-left border-collapse">
 <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md shadow-xs">
 <TableRow className="border-b border-border/60 text-xs font-semibold tracking-wider text-muted-foreground">
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
 <TableHead className="py-3 px-4 font-medium">Company & Title</TableHead>
 <TableHead className="py-3 px-4 font-medium">ATS Type</TableHead>
 <TableHead className="py-3 px-4 font-medium">Type</TableHead>
 <TableHead className="py-3 px-4 font-medium">Work Mode</TableHead>
 <TableHead className="py-3 px-4 font-medium">Exp (min-max)</TableHead>
 <TableHead className="py-3 px-4 font-medium">Skills (first 3)</TableHead>
 <TableHead className="py-3 px-4 text-center font-medium">Status</TableHead>
 <TableHead className="py-3 px-4 text-right font-medium">Created At</TableHead>
 <TableHead className="py-3 px-4 text-right font-medium">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="divide-y divide-border/40 text-xs">
 {loading ? (
 // Loading Skeleton Rows
 Array.from({ length: 5 }).map((_, i) => (
 <TableRow key={i} className="animate-pulse">
 <TableCell className="py-3 px-4"><div className="w-4 h-4 bg-muted/60 rounded" /></TableCell>
 <TableCell className="py-3 px-4">
   <div className="space-y-2">
     <div className="w-36 h-4 bg-muted/60 rounded" />
     <div className="w-24 h-3 bg-muted/60 rounded" />
   </div>
 </TableCell>
 <TableCell className="py-3 px-4"><div className="w-16 h-4 bg-muted/60 rounded" /></TableCell>
 <TableCell className="py-3 px-4"><div className="w-16 h-4 bg-muted/60 rounded" /></TableCell>
 <TableCell className="py-3 px-4"><div className="w-16 h-4 bg-muted/60 rounded" /></TableCell>
 <TableCell className="py-3 px-4"><div className="w-32 h-4 bg-muted/60 rounded" /></TableCell>
 <TableCell className="py-3 px-4 text-center"><div className="w-20 h-4 bg-muted/60 rounded mx-auto" /></TableCell>
 <TableCell className="py-3 px-4 text-right"><div className="w-20 h-4 bg-muted/60 rounded ml-auto" /></TableCell>
 <TableCell className="py-3 px-4 text-right"><div className="w-28 h-6 bg-muted/60 rounded ml-auto" /></TableCell>
 </TableRow>
 ))
 ) : paginatedJobs.map(job => {
 const jobType = job.type || 'JOB';
 const workMode = job.workMode || job.work_mode || '-';
 const skills = job.requiredSkills || job.required_skills || [];
 const first3Skills = skills.slice(0, 3);
 const extraSkillsCount = skills.length - 3;
 const createdAtStr = job.createdAt || job.created_at;
 const formattedDate = createdAtStr ? new Date(createdAtStr).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-';
 const applyUrl = job.applyLink || job.apply_link || '#';

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

 {/* Company & Title */}
 <TableCell className="py-3 px-4">
   <div className="flex flex-col gap-1.5">
     <span className="font-semibold text-foreground max-w-[220px] block truncate" title={job.title}>
       {job.title}
     </span>
     <div className="flex items-center gap-2 min-w-0">
       <CompanyLogo
         companyName={job.company}
         className="w-4 h-4 rounded shrink-0"
       />
       <span className="text-muted-foreground text-[11px] truncate max-w-[200px]">
         {job.company}
       </span>
     </div>
   </div>
 </TableCell>

 {/* ATS Type */}
 <TableCell className="py-3 px-4">
 <span className="bg-muted/60 border border-border/40 text-muted-foreground px-2 py-0.5 rounded text-[11px]">
 {detectAtsFromUrl(applyUrl)}
 </span>
 </TableCell>

 {/* Type */}
 <TableCell className="py-3 px-4">
 <span
 className={cn(
 'px-2 py-0.5 rounded text-[11px] font-bold border inline-block ',
 jobType === 'INTERNSHIP'
 ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
 : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
 )}
 >
 {jobType}
 </span>
 </TableCell>

 {/* Work Mode */}
 <TableCell className="py-3 px-4">
 <span className="bg-muted/60 border border-border/40 text-muted-foreground px-2 py-0.5 rounded text-[11px]">
 {workMode}
 </span>
 </TableCell>

 {/* Experience min-max */}
 <TableCell className="py-3 px-4 text-muted-foreground">
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
 <span className="px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground/80 text-[10px]">
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
 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
 : job.status === 'PENDING_REVIEW'
 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
 : job.status === 'APPROVED'
 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
 : job.status === 'EXPIRED'
 ? 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
 : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
 )}
 >
 {job.status.charAt(0).toUpperCase() + job.status.slice(1).toLowerCase().replace(/_/g, ' ')}
 </span>
 </TableCell>

 {/* Created At */}
 <TableCell className="py-3 px-4 text-right text-muted-foreground text-xs">
 {formattedDate}
 </TableCell>

 {/* Actions */}
 <TableCell className="py-3 px-4 text-right">
   <DropdownMenu>
     <DropdownMenuTrigger asChild>
       <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer focus:outline-none focus-visible:bg-muted/60 focus-visible:text-foreground">
         <EllipsisHorizontalIcon className="w-5 h-5" />
       </button>
     </DropdownMenuTrigger>
     <DropdownMenuContent align="end" className="w-40 text-xs">
        <DropdownMenuItem asChild>
          <a
            href={applyUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center cursor-pointer w-full"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" /> Apply Link
          </a>
        </DropdownMenuItem>
       <DropdownMenuItem onClick={() => setVerifyModalJob(job)} className="cursor-pointer">
         <EyeIcon className="w-4 h-4 mr-2" /> Preview JSON
       </DropdownMenuItem>
       
       {job.status === 'PENDING_REVIEW' && (
         <>
           <DropdownMenuItem onClick={() => handleApprove(job.id)} className="cursor-pointer text-emerald-600 dark:text-emerald-400">
             <CheckCircleIcon className="w-4 h-4 mr-2" /> Approve
           </DropdownMenuItem>
           <DropdownMenuItem onClick={() => handleReject(job.id)} className="cursor-pointer text-red-600 dark:text-red-400">
             <XCircleIcon className="w-4 h-4 mr-2" /> Reject
           </DropdownMenuItem>
         </>
       )}
       
       {job.status === 'APPROVED' && (
         <DropdownMenuItem onClick={() => handlePublish(job.id)} className="cursor-pointer">
           <SparklesIcon className="w-4 h-4 mr-2" /> Publish
         </DropdownMenuItem>
       )}

       <DropdownMenuSeparator />
       
       <DropdownMenuItem onClick={() => handleDeleteRequest([job.id])} className="cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-500/10 focus:text-red-600">
         <TrashIcon className="w-4 h-4 mr-2" /> Delete
       </DropdownMenuItem>
     </DropdownMenuContent>
   </DropdownMenu>
 </TableCell>
 </TableRow>
 );
 })}

 {!loading && filteredJobs.length === 0 && (
 <TableRow>
 <TableCell colSpan={10} className="p-8">
 <div className="py-12 flex flex-col items-center gap-2 text-center border-2 border-dashed border-border/60 rounded-xl text-muted-foreground text-xs">
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
 {filteredJobs.length > 0 && (
   <PaginationControls
     pageIndex={pageIndex}
     pageSize={pageSize}
     pageCount={Math.ceil(filteredJobs.length / pageSize)}
     totalRows={filteredJobs.length}
     selectedRows={selectedJobIds.size}
     canPreviousPage={pageIndex > 0}
     canNextPage={pageIndex < Math.ceil(filteredJobs.length / pageSize) - 1}
     setPageIndex={setPageIndex}
     setPageSize={setPageSize}
     previousPage={() => setPageIndex(p => Math.max(0, p - 1))}
     nextPage={() => setPageIndex(p => p + 1)}
   />
 )}
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





