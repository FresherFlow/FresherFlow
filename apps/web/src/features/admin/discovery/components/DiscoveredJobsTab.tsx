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
 EllipsisHorizontalIcon,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';
import { cn } from '@/lib/utils/utils';
import { DiscoveredJob } from '../types';
import { PayloadModal } from '../modals/PayloadModal';
import { toast } from 'react-hot-toast';
import { PaginationControls } from '@/ui/data-table/DataTablePagination';
import { detectAtsFromUrl } from '../utils';

export function DiscoveredJobsTab() {
 const [search, setSearch] = useState('');
 const [statusFilter, setStatusFilter] = useState<string>('ALL');
 const [atsFilter, setAtsFilter] = useState<string>('ALL');
 const [jobs, setJobs] = useState<DiscoveredJob[]>([]);
 const [loading, setLoading] = useState(true);
 const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
 const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
 const [previewJob, setPreviewJob] = useState<DiscoveredJob | null>(null);

 const [pageIndex, setPageIndex] = useState(0);
 const [pageSize, setPageSize] = useState(20);

 useEffect(() => {
   setPageIndex(0);
 }, [search, statusFilter, atsFilter]);

 useEffect(() => {
 let url = '/api/admin/discovery/jobs?limit=1000';
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

 const uniqueAtsTypes = Array.from(new Set(jobs.map(j => detectAtsFromUrl(j.applyLink || j.apply_link)))).filter(Boolean).sort();

 const filteredJobs = jobs.filter(j => {
  if (atsFilter !== 'ALL') {
    const ats = detectAtsFromUrl(j.applyLink || j.apply_link);
    if (ats !== atsFilter) return false;
  }
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
 <div className="flex flex-col h-full space-y-2 sm:space-y-4 min-h-0">
 {/* Header & Controls */}
 <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
 <QueueListIcon className="w-5 h-5" />
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h2 className="text-base font-bold text-foreground">Discovered Jobs Queue</h2>
 <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
 {jobs.length} jobs
 </span>
 </div>
 <p className="hidden md:block text-xs text-muted-foreground mt-0.5">
 Raw discovered job postings from ingestion crawlers
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
         placeholder="Search company, title, location..."
         className="w-full pl-9 pr-3 py-1.5 h-10 rounded-lg border border-border/80 bg-card text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus-visible:bg-muted/60 focus-visible:text-foreground"
       />
     </div>
     {selectedJobIds.size > 0 && (
       <button
         onClick={() => handleDeleteRequest(Array.from(selectedJobIds))}
         className="h-10 px-3 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
       >
         <TrashIcon className="w-3.5 h-3.5" />
         Delete Selected ({selectedJobIds.size})
       </button>
     )}
   </div>

   {/* Right Side: Filters */}
   <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
     <div className="flex items-center gap-2 shrink-0">
       <FunnelIcon className="w-4 h-4 text-muted-foreground" />
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
           <SelectItem value="DISCOVERED">Discovered</SelectItem>
           <SelectItem value="PROCESSED">Processed</SelectItem>
           <SelectItem value="PROCESSING">Processing</SelectItem>
           <SelectItem value="DUPLICATE">Duplicate</SelectItem>
           <SelectItem value="REJECTED">Rejected</SelectItem>
           <SelectItem value="FAILED">Failed</SelectItem>
           <SelectItem value="EXPIRED">Expired</SelectItem>
         </SelectContent>
       </Select>
     </div>
   </div>
 </div>

 {/* Discovered Jobs Table */}
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
 <TableHead className="py-3 px-4 font-medium">Location</TableHead>
 <TableHead className="py-3 px-4 font-medium">ATS Type</TableHead>
 <TableHead className="py-3 px-4 text-center font-medium">Fresher Score</TableHead>
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
 <TableCell className="py-3 px-4"><div className="w-20 h-4 bg-muted/60 rounded" /></TableCell>
 <TableCell className="py-3 px-4"><div className="w-16 h-4 bg-muted/60 rounded" /></TableCell>
 <TableCell className="py-3 px-4 text-center"><div className="w-12 h-4 bg-muted/60 rounded mx-auto" /></TableCell>
 <TableCell className="py-3 px-4 text-center"><div className="w-16 h-4 bg-muted/60 rounded mx-auto" /></TableCell>
 <TableCell className="py-3 px-4 text-right"><div className="w-20 h-4 bg-muted/60 rounded ml-auto" /></TableCell>
 <TableCell className="py-3 px-4 text-right"><div className="w-28 h-6 bg-muted/60 rounded ml-auto" /></TableCell>
 </TableRow>
 ))
 ) : paginatedJobs.map(job => {
  const applyUrl = job.applyLink || job.apply_link || '#';
  const atsType = detectAtsFromUrl(applyUrl);
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
 
 {/* Company & Title */}
 <TableCell className="py-3 px-4">
   <div className="flex flex-col gap-1.5">
     <span className="font-semibold text-foreground max-w-[240px] block truncate" title={job.title}>
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

 {/* Location */}
 <TableCell className="py-3 px-4 text-muted-foreground">
 <div className="flex items-center gap-1 text-xs">
 <MapPinIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
 <span className="truncate max-w-[140px]">{job.location || 'Not specified'}</span>
 </div>
 </TableCell>

 {/* ATS Type */}
 <TableCell className="py-3 px-4">
 <span className="bg-muted/60 border border-border/40 text-muted-foreground px-2 py-0.5 rounded text-[11px]">
 {atsType}
 </span>
 </TableCell>

 {/* Fresher Score */}
 <TableCell className="py-3 px-4 text-center">
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
 </TableCell>

 {/* Status */}
 <TableCell className="py-3 px-4 text-center">
 <span
 className={cn(
 'px-2 py-0.5 rounded text-[11px] font-bold border inline-block',
 job.status === 'PROCESSED'
 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
 : job.status === 'PROCESSING'
 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
 : job.status === 'DISCOVERED'
 ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
 : job.status === 'DUPLICATE'
 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
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
       <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer outline-none focus-visible:bg-muted/60 focus-visible:text-foreground">
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
       <DropdownMenuItem onClick={() => setPreviewJob(job)} className="cursor-pointer">
         <EyeIcon className="w-4 h-4 mr-2" /> Preview JSON
       </DropdownMenuItem>

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
 <TableCell colSpan={9} className="p-8">
 <div className="py-12 flex flex-col items-center gap-2 text-center border-2 border-dashed border-border/60 rounded-xl text-muted-foreground text-xs">
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





