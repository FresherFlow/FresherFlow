import React from 'react';
import Link from 'next/link';
import { Opportunity } from '@fresherflow/types';
import { SocialOpportunity } from '@/features/admin/opportunities/listUtils';
import CompanyLogo from '@/features/system/components/ui/CompanyLogo';
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
    ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import {
    formatLastVerified,
    formatLinkHealth,
    getStatusLabel,
    linkHealthClass,
    getStatusBadgeClass
} from '@/features/admin/opportunities/listUtils';

interface AdminOpportunitiesTableProps {
    opportunities: (Opportunity & { deletedAt?: string | Date | null; expiredAt?: string | Date | null })[];
    selectedIds: string[];
    bulkActionPending: boolean;
    toggleSelect: (id: string) => void;
    toggleSelectAll: () => void;
    handleExpire: (id: string, title: string) => void;
    handleStatusUpdate: (id: string, status: string) => void;
    handleDelete: (id: string, title: string) => void;
    handleRejectDraft: (id: string, title: string) => void;
    handleRestore: (id: string) => void;
    copySocialCaption: (opp: SocialOpportunity) => void;
    getPublicOpportunityHref: (opp: { id: string; slug?: string | null; type: Opportunity['type'] }) => string;
    page: number;
    pageSize: number;
    totalCount: number;
    effectiveTotalPages: number;
    setPage: (p: number | ((prev: number) => number)) => void;
}

export const AdminOpportunitiesTable = ({
    opportunities,
    selectedIds,
    bulkActionPending,
    toggleSelect,
    toggleSelectAll,
    handleExpire,
    handleStatusUpdate,
    handleDelete,
    handleRejectDraft,
    handleRestore,
    copySocialCaption,
    getPublicOpportunityHref,
    page,
    pageSize,
    totalCount,
    effectiveTotalPages,
    setPage
}: AdminOpportunitiesTableProps) => {
    const hasNextPage = page < effectiveTotalPages;

    return (
        <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/50">
                        <th className="group px-5 py-3 w-10">
                            <div
                                onClick={bulkActionPending ? undefined : toggleSelectAll}
                                className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${bulkActionPending ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${selectedIds.length === opportunities.length && opportunities.length > 0
                                    ? 'bg-primary border-primary'
                                    : 'border-muted-foreground/30 hover:border-primary'
                                    }`}
                            >
                                {selectedIds.length === opportunities.length && opportunities.length > 0 && (
                                    <div className="w-2 h-2 bg-primary-foreground rounded-[1px]" />
                                )}
                            </div>
                        </th>
                        <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Opportunity</th>
                        <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Details</th>
                        <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                        <th className="px-5 py-3 text-xs font-medium text-muted-foreground text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {opportunities.map((opp) => (
                        <tr key={opp.id} className={`hover:bg-muted/50 transition-colors group ${selectedIds.includes(opp.id) ? 'bg-primary/5' : ''}`}>
                            <td className="px-5 py-4">
                                <div
                                    onClick={bulkActionPending ? undefined : () => toggleSelect(opp.id)}
                                    className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${bulkActionPending ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${selectedIds.includes(opp.id)
                                        ? 'bg-primary border-primary'
                                        : 'border-muted-foreground/30 hover:border-primary'
                                        }`}
                                >
                                    {selectedIds.includes(opp.id) && (
                                        <div className="w-2 h-2 bg-primary-foreground rounded-[1px]" />
                                    )}
                                </div>
                            </td>
                            <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <CompanyLogo
                                        companyName={opp.company}
                                        companyWebsite={opp.companyWebsite}
                                        applyLink={opp.applyLink}
                                        className="w-8 h-8 rounded-md flex-shrink-0"
                                    />
                                    <div>
                                        <div className="font-medium text-foreground">{opp.title}</div>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                            <span>{opp.company}</span>
                                            <span className="text-[9px] capitalize tracking-wide px-1.5 py-0.5 rounded bg-muted/50 border border-border">
                                                {opp.type}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-5 py-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <MapPinIcon className="w-3 h-3" />
                                        <span className="truncate max-w-[200px]">{opp.locations.join(', ')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <CalendarIcon className="w-3 h-3" />
                                        {new Date(opp.postedAt).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${linkHealthClass(opp.linkHealth)}`}>
                                            {formatLinkHealth(opp.linkHealth)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            Fails: {opp.verificationFailures ?? 0}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        Verified: {formatLastVerified(opp.lastVerifiedAt)}
                                    </div>
                                </div>
                            </td>
                            <td className="px-5 py-4">
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${getStatusBadgeClass(opp)}`}>
                                    {getStatusLabel(opp)}
                                </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <button
                                        onClick={() => void copySocialCaption(opp)}
                                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all"
                                        title="Copy social caption"
                                    >
                                        <DocumentDuplicateIcon className="w-4 h-4" />
                                    </button>
                                    {(opp.applyLink || opp.sourceLink) && (
                                        <a
                                            href={(opp.applyLink || opp.sourceLink) as string}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-all"
                                            title="Open apply link"
                                        >
                                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                        </a>
                                    )}
                                    <Link
                                        href={getPublicOpportunityHref(opp)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all"
                                        title="View as user"
                                    >
                                        <EyeIcon className="w-4 h-4" />
                                    </Link>
                                    <Link
                                        href={`/admin/opportunities/edit/${opp.slug || opp.id}`}
                                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all"
                                        title="Edit"
                                    >
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </Link>
                                    {opp.status === 'DRAFT' && (
                                        <>
                                            <button
                                                onClick={() => handleStatusUpdate(opp.id, 'PUBLISHED')}
                                                className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-md transition-all"
                                                title="Publish Now"
                                            >
                                                <CheckCircleIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleRejectDraft(opp.id, opp.title)}
                                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                                                title="Reject Draft"
                                            >
                                                <XCircleIcon className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    {opp.status === 'PUBLISHED' && (
                                        <button
                                            onClick={() => handleExpire(opp.id, opp.title)}
                                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all"
                                            title="Expire"
                                        >
                                            <ClockIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(opp.id, opp.title)}
                                        className="p-2 text-rose-700 hover:bg-rose-50 rounded-md transition-all"
                                        title="Remove"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                    {getStatusLabel(opp) === 'DELETED' && (
                                        <button
                                            onClick={() => handleRestore(opp.id)}
                                            className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-md transition-all"
                                            title="Restore"
                                        >
                                            <ArrowPathIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Pagination */}
            <div className="px-5 py-4 border-t border-border bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground order-2 md:order-1">
                    Showing <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * pageSize, totalCount)}</span> of <span className="font-medium text-foreground">{totalCount}</span> results
                </div>
                <div className="flex items-center gap-1.5 order-1 md:order-2">
                    <button
                        onClick={() => setPage(prev => Math.max(1, (typeof prev === 'number' ? prev : 1) - 1))}
                        disabled={page === 1}
                        className="h-8 px-3 rounded border border-input bg-background text-xs font-medium disabled:opacity-50 hover:bg-accent transition-colors"
                    >
                        Previous
                    </button>
                    <div className="flex items-center gap-1">
                        {[...Array(Math.min(5, effectiveTotalPages))].map((_, i) => {
                            let pageNum = page;
                            if (effectiveTotalPages <= 5) pageNum = i + 1;
                            else if (page <= 3) pageNum = i + 1;
                            else if (page >= effectiveTotalPages - 2) pageNum = effectiveTotalPages - 4 + i;
                            else pageNum = page - 2 + i;

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setPage(pageNum)}
                                    className={`w-8 h-8 rounded text-xs font-medium transition-colors ${page === pageNum
                                        ? 'bg-primary text-primary-foreground'
                                        : 'border border-input bg-background hover:bg-accent'
                                        }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        onClick={() => setPage(prev => Math.min(effectiveTotalPages, (typeof prev === 'number' ? prev : 1) + 1))}
                        disabled={!hasNextPage}
                        className="h-8 px-3 rounded border border-input bg-background text-xs font-medium disabled:opacity-50 hover:bg-accent transition-colors"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};
