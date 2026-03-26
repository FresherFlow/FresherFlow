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

interface AdminOpportunitiesMobileListProps {
    opportunities: (Opportunity & { deletedAt?: string | Date | null; expiredAt?: string | Date | null })[];
    selectedIds: string[];
    toggleSelect: (id: string) => void;
    handleExpire: (id: string, title: string) => void;
    handleStatusUpdate: (id: string, status: string) => void;
    handleDelete: (id: string, title: string) => void;
    handleRestore: (id: string) => void;
    copySocialCaption: (opp: SocialOpportunity) => void;
    getPublicOpportunityHref: (opp: { id: string; slug?: string | null; type: Opportunity['type'] }) => string;
}

export const AdminOpportunitiesMobileList = ({
    opportunities,
    selectedIds,
    toggleSelect,
    handleExpire,
    handleStatusUpdate,
    handleDelete,
    handleRestore,
    copySocialCaption,
    getPublicOpportunityHref
}: AdminOpportunitiesMobileListProps) => {
    return (
        <div className="md:hidden space-y-3">
            {opportunities.map((opp) => (
                <div key={opp.id} className="bg-card rounded-lg border border-border p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div
                                onClick={() => toggleSelect(opp.id)}
                                className={`w-4 h-4 mt-1 rounded border transition-colors cursor-pointer flex-shrink-0 flex items-center justify-center ${selectedIds.includes(opp.id)
                                    ? 'bg-primary border-primary'
                                    : 'border-muted-foreground/30 hover:border-primary'
                                    }`}
                            >
                                {selectedIds.includes(opp.id) && (
                                    <div className="w-2 h-2 bg-primary-foreground rounded-[1px]" />
                                )}
                            </div>
                            <CompanyLogo
                                companyName={opp.company}
                                companyWebsite={opp.companyWebsite}
                                applyLink={opp.applyLink}
                                className="w-9 h-9 rounded-md flex-shrink-0"
                            />
                            <div>
                                <div className="font-medium text-foreground">{opp.title}</div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                    <span>{opp.company}</span>
                                    <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted/50 border border-border">
                                        {opp.type}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${getStatusBadgeClass(opp)}`}>
                            {getStatusLabel(opp)}
                        </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <MapPinIcon className="w-3 h-3" />
                            <span className="truncate">{opp.locations.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <CalendarIcon className="w-3 h-3" />
                            {new Date(opp.postedAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${linkHealthClass(opp.linkHealth)}`}>
                                {formatLinkHealth(opp.linkHealth)}
                            </span>
                            <span className="text-[10px]">Fails: {opp.verificationFailures ?? 0}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                            Verified: {formatLastVerified(opp.lastVerifiedAt)}
                        </div>
                    </div>

                    <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-4 gap-2">
                            <button
                                onClick={() => void copySocialCaption(opp)}
                                className="h-8 px-2 inline-flex items-center justify-center rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                                title="Copy social caption"
                            >
                                <DocumentDuplicateIcon className="w-4 h-4" />
                            </button>
                            {(opp.applyLink || opp.sourceLink) && (
                                <a
                                    href={(opp.applyLink || opp.sourceLink) as string}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-8 px-2 inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100"
                                    title="Open apply link"
                                >
                                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                </a>
                            )}
                            <Link
                                href={getPublicOpportunityHref(opp)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 px-2 inline-flex items-center justify-center rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                                title="View as user"
                            >
                                <EyeIcon className="w-4 h-4" />
                            </Link>
                            <Link
                                href={`/admin/opportunities/edit/${opp.slug || opp.id}`}
                                className="h-8 px-2 inline-flex items-center justify-center rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                                title="Edit"
                            >
                                <PencilSquareIcon className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {opp.status === 'DRAFT' && (
                                <button
                                    onClick={() => handleStatusUpdate(opp.id, 'PUBLISHED')}
                                    className="h-8 px-2 inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                                    title="Publish Now"
                                >
                                    <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                                    Publish
                                </button>
                            )}
                            {opp.status === 'PUBLISHED' && (
                                <button
                                    onClick={() => handleExpire(opp.id, opp.title)}
                                    className="h-8 px-2 inline-flex items-center justify-center rounded-md border border-input bg-background text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                                    title="Expire"
                                >
                                    <ClockIcon className="w-4 h-4 mr-1.5" />
                                    Expire
                                </button>
                            )}
                            <button
                                onClick={() => handleDelete(opp.id, opp.title)}
                                className="h-8 px-2 inline-flex items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-xs font-medium text-rose-700 hover:bg-rose-100"
                                title="Remove"
                            >
                                <TrashIcon className="w-4 h-4 mr-1.5" />
                                Remove
                            </button>
                            {getStatusLabel(opp) === 'DELETED' && (
                                <button
                                    onClick={() => handleRestore(opp.id)}
                                    className="h-8 px-2 inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                                    title="Restore"
                                >
                                    <ArrowPathIcon className="w-4 h-4 mr-1.5" />
                                    Restore
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};






