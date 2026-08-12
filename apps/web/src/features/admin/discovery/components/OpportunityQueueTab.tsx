'use client';

import { useState, useEffect } from 'react';
import { CpuChipIcon, CodeBracketIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';
import { PaginationControls } from '@/ui/data-table/DataTablePagination';
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
    if (activeHash === 'queue') return 'Ingestion review queue (pending)';
    if (activeHash === 'verified') return 'Verified directory (published)';
    return 'Hold & archived drafts';
  };

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setPageIndex(0);
  }, [activeHash, opportunities.length]);

  const paginatedOpportunities = opportunities.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

 return (
 <div className="space-y-3">
 <div className="border-b border-border/60 pb-2.5 flex items-center justify-between">
 <span className="text-xs font-bold tracking-wider text-muted-foreground">
 {getTabTitle()}
 </span>
 <div className="flex items-center gap-3">
 <span className="text-xs text-muted-foreground">{opportunities.length} records</span>
 {activeHash === 'queue' && opportunities.length > 0 && onPublishAll && (
 <button
 onClick={onPublishAll}
 className="h-7 px-3 rounded-md text-xs font-medium bg-muted/40 border border-border/80 text-foreground hover:bg-muted transition-all duration-100 ease-out active:scale-[0.96] shadow-xs cursor-pointer"
 >
 Publish All
 </button>
 )}
 </div>
 </div>

 {isLoading ? (
 <div className="p-12 text-center border border-dashed border-border/80 rounded-2xl bg-card/40 backdrop-blur-xs">
 <p className="text-xs text-muted-foreground animate-pulse">Loading opportunities...</p>
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
 <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden shadow-xs flex flex-col flex-1 min-h-0">
 <div className="overflow-auto flex-1 min-h-0 custom-scrollbar">
 <Table className="w-full text-left border-collapse">
 <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-md shadow-xs">
 <TableRow className="border-b border-border/60 text-xs font-semibold tracking-wider text-muted-foreground">
 <TableHead className="py-3 px-4 font-medium">Role / Company</TableHead>
 <TableHead className="py-3 px-4 font-medium">Links</TableHead>
 <TableHead className="py-3 px-4 text-right font-medium">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="divide-y divide-border/40 text-xs">
 {paginatedOpportunities.map((job, index) => (
 <TableRow
 key={job.id}
 className="hover:bg-muted/30 transition-colors duration-150 ease-out animate-in fade-in slide-in-from-bottom-2"
 style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
 >
 <TableCell className="py-3 px-4">
 <div className="flex items-center gap-3 min-w-0">
 <CompanyLogo
 companyName={job.company}
 companyLogoUrl={job.companyLogoUrl}
 applyLink={job.applyLink}
 className="w-8 h-8 rounded-md border border-border/60 bg-card shadow-xs shrink-0"
 />
 <div className="min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <h3 className="text-sm font-medium text-foreground truncate shrink-0">{job.title}</h3>
 <span className="text-xs text-muted-foreground truncate">{job.company}</span>
 <span className="bg-muted/50 text-muted-foreground font-medium text-xs border border-border/40 px-1.5 py-0.5 rounded truncate">
 {job.source || 'ATS'}
 </span>
 </div>
 </div>
 </div>
 </TableCell>

 <TableCell className="py-3 px-4">
 <div className="flex items-center gap-2">
 <button
 onClick={() => onInspectPayload(job)}
 className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
 >
 <CodeBracketIcon className="w-3 h-3" /> payload
 </button>
 {job.applyLink && (
 <a
 href={job.applyLink}
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
 >
 <ArrowTopRightOnSquareIcon className="w-3 h-3" /> link
 </a>
 )}
 </div>
 </TableCell>

 <TableCell className="py-3 px-4 text-right">
 <div className="flex items-center justify-end gap-2 shrink-0">
 {activeHash === 'queue' && (
 <>
 <button
 onClick={() => onPublish(job.id)}
 disabled={isActionLoading === job.id}
 className="h-7 px-3 rounded-md bg-muted/40 border border-border/80 text-foreground hover:bg-muted text-xs font-medium transition-all duration-100 ease-out active:scale-[0.96] shadow-xs cursor-pointer disabled:opacity-50"
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
 <span className="text-xs font-semibold text-foreground px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
 Published
 </span>
 )}
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 {opportunities.length > 0 && (
 <PaginationControls
 pageIndex={pageIndex}
 pageSize={pageSize}
 pageCount={Math.ceil(opportunities.length / pageSize)}
 totalRows={opportunities.length}
 canPreviousPage={pageIndex > 0}
 canNextPage={pageIndex < Math.ceil(opportunities.length / pageSize) - 1}
 setPageIndex={setPageIndex}
 setPageSize={setPageSize}
 previousPage={() => setPageIndex(p => Math.max(0, p - 1))}
 nextPage={() => setPageIndex(p => p + 1)}
 />
 )}
 </div>
 )}
 </div>
 );
}
