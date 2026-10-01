'use client';

import { useState, useEffect } from 'react';
import { CodeBracketIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/Table';
import { PaginationControls } from '@/ui/data-table/DataTablePagination';
import { Skeleton } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import CompanyLogo from '@/features/companies/components/CompanyLogo';
import { toSafeOutboundUrl } from '@/lib/utils/safeOutboundUrl';
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
 className="h-7 px-3 rounded-md text-xs font-medium bg-muted/40 border border-border/80 text-foreground hover:bg-muted transition-all duration-100 ease-out active:scale-95 shadow-xs cursor-pointer"
 >
 Publish All
 </button>
 )}
 </div>
 </div>

  {isLoading ? (
  <div className="space-y-3 py-2">
  <Skeleton className="h-4 w-1/3" />
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-2/3" />
  </div>
  ) : opportunities.length === 0 ? (
  <div className="py-6">
  <EmptyState
  title="No items in this section"
  description="Discovered opportunities from ATS connectors will stream here automatically."
  icon="inbox"
  size="md"
  variant="ghost"
  />
  </div>
 ) : (
 <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden shadow-xs flex flex-col flex-1 min-h-0">
 <div className="overflow-auto flex-1 min-h-0">
 <Table>
 <TableHeader className="sticky top-0 z-10">
 <TableRow>
 <TableHead>Role / Company</TableHead>
 <TableHead>Links</TableHead>
 <TableHead className="text-right">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {paginatedOpportunities.map((job, index) => (
 <TableRow
 key={job.id}
 style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
 >
 <TableCell>
 <div className="flex items-center gap-3 min-w-0">
 <CompanyLogo
 companyName={job.company}
 companyLogoUrl={job.companyLogoUrl}
 applyLink={job.applyLink}
 className="w-8 h-8 shrink-0"
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

 <TableCell>
 <div className="flex items-center gap-2">
 <button
 onClick={() => onInspectPayload(job)}
 className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
 >
 <CodeBracketIcon className="w-3 h-3" /> payload
 </button>
 {toSafeOutboundUrl(job.applyLink) && (
 <a
 href={toSafeOutboundUrl(job.applyLink) ?? undefined}
 target="_blank"
 rel="noopener noreferrer"
 className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
 >
 <ArrowTopRightOnSquareIcon className="w-3 h-3" /> link
 </a>
 )}
 </div>
 </TableCell>

 <TableCell className="text-right">
 <div className="flex items-center justify-end gap-2 shrink-0">
 {activeHash === 'queue' && (
 <>
 <button
 onClick={() => onPublish(job.id)}
 disabled={isActionLoading === job.id}
 className="h-7 px-3 rounded-md bg-muted/40 border border-border/80 text-foreground hover:bg-muted text-xs font-medium transition-all duration-100 ease-out active:scale-95 shadow-xs cursor-pointer disabled:opacity-50"
 >
 Publish
 </button>
 <button
 onClick={() => onReject(job.id)}
 disabled={isActionLoading === job.id}
 title="Archive"
 className="h-7 w-7 flex items-center justify-center rounded-md border border-border/60 bg-muted/40 hover:bg-destructive/10 text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-transform duration-100 ease-out active:scale-95 cursor-pointer disabled:opacity-50"
 >
 <span className="text-lg leading-none mb-0.5">–</span>
 </button>
 </>
 )}
 {activeHash === 'verified' && (
 <span className="text-xs font-semibold text-foreground px-2 py-0.5 bg-success/10 rounded border border-success/20">
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
