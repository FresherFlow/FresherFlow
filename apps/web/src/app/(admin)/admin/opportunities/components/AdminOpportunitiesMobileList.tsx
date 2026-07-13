import React from 'react';
import Link from 'next/link';
import { Opportunity } from '@fresherflow/types';
import { SocialOpportunity } from '@/features/admin/opportunities/listUtils';
import CompanyLogo from '@/ui/CompanyLogo';
import {
    MapPinIcon,
    CalendarIcon,
    PencilSquareIcon,
    TrashIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    EyeIcon,
    DocumentDuplicateIcon,
    ArrowTopRightOnSquareIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {
    getStatusLabel,
    getStatusBadgeClass,
} from '@/features/admin/opportunities/listUtils';

interface AdminOpportunitiesMobileListProps {
    opportunities: (Opportunity & { deletedAt?: string | Date | null; expiredAt?: string | Date | null })[];
    selectedIds: string[];
    toggleSelect: (id: string) => void;
    handleExpire: (id: string, title: string, status?: string) => void;
    handleStatusUpdate: (id: string, status: string) => void;
    handleDelete: (id: string, title: string) => void;
    handleHardDelete: (id: string, title: string) => void;
    handleRejectDraft: (id: string, title: string) => void;
    handleRestore: (id: string) => void;
    copySocialCaption: (opp: SocialOpportunity) => void;

    onPreview: (id: string) => void;
    page: number;
    pageSize: number;
    totalCount: number;
    effectiveTotalPages: number;
    setPage: React.Dispatch<React.SetStateAction<number>>;
}

export const AdminOpportunitiesMobileList = ({
    opportunities,
    selectedIds,
    toggleSelect,
    handleExpire,
    handleStatusUpdate,
    handleDelete,
    handleHardDelete,
    handleRejectDraft,
    handleRestore,
    copySocialCaption,

    onPreview,
    page,
    pageSize,
    totalCount,
    effectiveTotalPages,
    setPage,
}: AdminOpportunitiesMobileListProps) => {
    return (
        <div className="md:hidden flex flex-col flex-1 min-h-0 -mx-4 -mb-4 sm:mx-0 sm:mb-0">
            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar px-4 pb-4 sm:px-0 min-h-0">
                {opportunities.map((opp) => {
                    const isSelected = selectedIds.includes(opp.id);
                    const isDraft = opp.status === 'DRAFT';
                    const isDeleted = getStatusLabel(opp) === 'DELETED';
                    const isPublishedOrExpired = opp.status === 'PUBLISHED' || opp.status === 'EXPIRED';

                    return (
                        <div
                            key={opp.id}
                            className={`bg-card rounded-xl border transition-colors ${isSelected ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'}`}
                        >
                            {/* Card header */}
                            <div className="flex items-start gap-3 p-3">
                                {/* Checkbox */}
                                <div
                                    onClick={() => toggleSelect(opp.id)}
                                    className={`w-4 h-4 mt-1.5 rounded border transition-colors cursor-pointer shrink-0 flex items-center justify-center ${
                                        isSelected ? 'bg-primary border-primary' : 'border-border hover:border-primary'
                                    }`}
                                >
                                    {isSelected && <div className="w-2 h-2 bg-primary-foreground rounded-[1px]" />}
                                </div>

                                {/* Logo */}
                                <CompanyLogo
                                    companyName={opp.company}
                                    companyWebsite={opp.companyWebsite}
                                    companyLogoUrl={opp.companyLogoUrl}
                                    applyLink={opp.applyLink}
                                    isGovernment={opp.type === 'GOVERNMENT' || Boolean(opp.governmentJobDetails)}
                                    className="w-9 h-9 rounded-lg shrink-0"
                                />

                                {/* Title + company + status */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <button
                                            onClick={() => onPreview(opp.id)}
                                            className="text-sm font-semibold text-foreground hover:text-primary text-left leading-snug line-clamp-2"
                                        >
                                            {opp.title}
                                        </button>
                                        <span className={`shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${getStatusBadgeClass(opp)}`}>
                                            {getStatusLabel(opp)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        <span className="text-xs text-muted-foreground">{opp.company}</span>
                                        <span className="text-[9px] capitalize tracking-wide px-1.5 py-0.5 rounded bg-muted/60 border border-border text-muted-foreground">
                                            {opp.type}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Meta row */}
                            <div className="px-3 pb-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                                {opp.locations?.length > 0 && (
                                    <span className="flex items-center gap-1 truncate">
                                        <MapPinIcon className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{opp.locations.slice(0, 2).join(', ')}</span>
                                    </span>
                                )}
                                {opp.postedAt && (
                                    <span className="flex items-center gap-1 shrink-0">
                                        <CalendarIcon className="w-3 h-3" />
                                        {new Date(opp.postedAt).toLocaleDateString()}
                                    </span>
                                )}
                            </div>

                            {/* Action buttons */}
                            <div className="border-t border-border/60 px-3 py-2.5 space-y-2">
                                {/* Row 1: quick icon actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => void copySocialCaption(opp)}
                                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                        title="Copy social caption"
                                    >
                                        <DocumentDuplicateIcon className="w-4 h-4" />
                                    </button>
                                    {(opp.applyLink || opp.sourceLink) && (
                                        <a
                                            href={(opp.applyLink || opp.sourceLink) as string}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                            title="Open apply link"
                                        >
                                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => onPreview(opp.id)}
                                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                        title="Preview"
                                    >
                                        <EyeIcon className="w-4 h-4" />
                                    </button>
                                    <Link
                                        href={`/admin/opportunities/edit/${opp.slug || opp.id}`}
                                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                        title="Edit"
                                    >
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </Link>
                                </div>

                                {/* Row 2: status actions */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {isDraft && (
                                        <>
                                            <button
                                                onClick={() => handleStatusUpdate(opp.id, 'PUBLISHED')}
                                                className="h-7 px-3 inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                                            >
                                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                                Publish
                                            </button>
                                            <button
                                                onClick={() => handleRejectDraft(opp.id, opp.title)}
                                                className="h-7 px-3 inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                                            >
                                                <XCircleIcon className="w-3.5 h-3.5" />
                                                Reject
                                            </button>
                                        </>
                                    )}
                                    {isPublishedOrExpired && (
                                        <button
                                            onClick={() => handleExpire(opp.id, opp.title, opp.status)}
                                            className="h-7 px-3 inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                        >
                                            <ClockIcon className="w-3.5 h-3.5" />
                                            Set Status
                                        </button>
                                    )}
                                    {isDeleted && (
                                        <button
                                            onClick={() => handleRestore(opp.id)}
                                            className="h-7 px-3 inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                                        >
                                            <ArrowPathIcon className="w-3.5 h-3.5" />
                                            Restore
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(opp.id, opp.title)}
                                        className="h-7 px-3 inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                        Archive
                                    </button>
                                    <button
                                        onClick={() => handleHardDelete(opp.id, opp.title)}
                                        className="h-7 px-3 inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 text-[11px] font-semibold text-red-900 hover:bg-red-100 transition-colors"
                                    >
                                        <XCircleIcon className="w-3.5 h-3.5" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Pagination */}
                {opportunities.length > 0 && (
                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/40 pb-4 px-1 sm:px-2">
                        <div className="text-[11px] text-muted-foreground">
                            Showing <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * pageSize, totalCount)}</span> of <span className="font-medium text-foreground">{totalCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, (typeof p === 'number' ? p : 1) - 1))}
                                disabled={page === 1}
                                className="h-8 px-3 flex items-center justify-center rounded-md border border-border bg-card text-xs font-medium disabled:opacity-40 hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                                <ChevronLeftIcon className="w-3.5 h-3.5 mr-1" />
                                Prev
                            </button>
                            <span className="text-xs font-semibold text-foreground min-w-[50px] text-center">
                                {page} / {effectiveTotalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(effectiveTotalPages, (typeof p === 'number' ? p : 1) + 1))}
                                disabled={page === effectiveTotalPages}
                                className="h-8 px-3 flex items-center justify-center rounded-md border border-border bg-card text-xs font-medium disabled:opacity-40 hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                                Next
                                <ChevronRightIcon className="w-3.5 h-3.5 ml-1" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
