import React from 'react';
import Link from 'next/link';
import { Opportunity } from '@fresherflow/types';
import { SocialOpportunity, getStatusLabel, getStatusBadgeClass } from '@/features/admin/opportunities/listUtils';
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
import { Button } from '@/ui/Button';

type Opp = Opportunity & { deletedAt?: string | Date | null; expiredAt?: string | Date | null };

interface Props {
    opportunities: Opp[];
    selectedIds: string[];
    bulkActionPending?: boolean;
    toggleSelect: (id: string) => void;
    toggleSelectAll?: () => void;
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
    setPage: (p: number | ((prev: number) => number)) => void;
}

// ─── Shared icon action button ────────────────────────────────────────────────
const IconBtn = ({ onClick, title, className, children }: {
    onClick?: () => void;
    title: string;
    className?: string;
    children: React.ReactNode;
}) => (
    <button
        onClick={onClick}
        title={title}
        className={`p-1.5 rounded-md transition-colors duration-100 active:scale-[0.93] ${className ?? 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
    >
        {children}
    </button>
);

// ─── Row actions shared between table & mobile card ──────────────────────────
const RowActions = ({ opp, onPreview, copySocialCaption, handleStatusUpdate, handleExpire, handleRejectDraft, handleRestore, handleDelete, handleHardDelete }: Pick<Props, 'onPreview' | 'copySocialCaption' | 'handleStatusUpdate' | 'handleExpire' | 'handleRejectDraft' | 'handleRestore' | 'handleDelete' | 'handleHardDelete'> & { opp: Opp }) => {
    const isDraft = opp.status === 'DRAFT';
    const isPublishedOrExpired = opp.status === 'PUBLISHED' || opp.status === 'EXPIRED';
    const isDeleted = getStatusLabel(opp) === 'DELETED';

    return (
        <div className="flex items-center gap-0.5 flex-wrap select-none">
            <IconBtn onClick={() => void copySocialCaption(opp)} title="Copy social caption">
                <DocumentDuplicateIcon className="w-4 h-4" />
            </IconBtn>
            {(opp.applyLink || opp.sourceLink) && (
                <a
                    href={(opp.applyLink || opp.sourceLink) as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open link"
                    className="p-1.5 rounded-md text-blue-500 hover:bg-blue-500/10 transition-colors"
                >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </a>
            )}
            <IconBtn onClick={() => onPreview(opp.id)} title="Preview">
                <EyeIcon className="w-4 h-4" />
            </IconBtn>
            <Link
                href={`/admin/opportunities/edit/${opp.slug || opp.id}`}
                title="Edit"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
                <PencilSquareIcon className="w-4 h-4" />
            </Link>

            {isDraft && (
                <>
                    <IconBtn onClick={() => handleStatusUpdate(opp.id, 'PUBLISHED')} title="Publish" className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
                        <CheckCircleIcon className="w-4 h-4" />
                    </IconBtn>
                    <IconBtn onClick={() => handleRejectDraft(opp.id, opp.title)} title="Reject" className="text-destructive hover:bg-destructive/10">
                        <XCircleIcon className="w-4 h-4" />
                    </IconBtn>
                </>
            )}
            {isPublishedOrExpired && (
                <IconBtn onClick={() => handleExpire(opp.id, opp.title, opp.status)} title="Change Status">
                    <ClockIcon className="w-4 h-4" />
                </IconBtn>
            )}
            {isDeleted && (
                <IconBtn onClick={() => handleRestore(opp.id)} title="Restore" className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
                    <ArrowPathIcon className="w-4 h-4" />
                </IconBtn>
            )}
            <IconBtn onClick={() => handleDelete(opp.id, opp.title)} title="Archive" className="text-destructive hover:bg-destructive/10">
                <TrashIcon className="w-4 h-4" />
            </IconBtn>
            <IconBtn onClick={() => handleHardDelete(opp.id, opp.title)} title="Hard Delete" className="text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 ml-0.5">
                <XCircleIcon className="w-4 h-4" />
            </IconBtn>
        </div>
    );
};

// ─── Checkbox ─────────────────────────────────────────────────────────────────
const Checkbox = ({ checked, onClick, disabled }: { checked: boolean; onClick: () => void; disabled?: boolean }) => (
    <div
        onClick={disabled ? undefined : onClick}
        className={`w-4 h-4 rounded border transition-colors flex items-center justify-center shrink-0 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${checked ? 'bg-primary border-primary' : 'border-muted-foreground/30 hover:border-primary'}`}
    >
        {checked && <div className="w-2 h-2 bg-primary-foreground rounded-[1px]" />}
    </div>
);

// ─── Pagination ───────────────────────────────────────────────────────────────
const Pagination = ({ page, effectiveTotalPages, totalCount, pageSize, setPage }: Pick<Props, 'page' | 'effectiveTotalPages' | 'totalCount' | 'pageSize' | 'setPage'>) => (
    <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}</span>–<span className="font-medium text-foreground">{Math.min(page * pageSize, totalCount)}</span> of <span className="font-medium text-foreground">{totalCount}</span>
        </span>
        <div className="flex items-center gap-1">
            <Button
                variant="admin"
                size="sm"
                onClick={() => setPage(p => Math.max(1, (typeof p === 'number' ? p : 1) - 1))}
                disabled={page === 1}
                className="h-8 px-2.5 flex items-center gap-1 text-xs"
            >
                <ChevronLeftIcon className="w-3.5 h-3.5" /> Prev
            </Button>
            {[...Array(Math.min(5, effectiveTotalPages))].map((_, i) => {
                let p = i + 1;
                if (effectiveTotalPages > 5) {
                    if (page <= 3) p = i + 1;
                    else if (page >= effectiveTotalPages - 2) p = effectiveTotalPages - 4 + i;
                    else p = page - 2 + i;
                }
                return (
                    <Button
                        key={p}
                        variant={page === p ? "default" : "admin"}
                        size="sm"
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 p-0 text-xs ${page === p ? '' : 'border-input bg-muted/40'}`}
                    >
                        {p}
                    </Button>
                );
            })}
            <Button
                variant="admin"
                size="sm"
                onClick={() => setPage(p => Math.min(effectiveTotalPages, (typeof p === 'number' ? p : 1) + 1))}
                disabled={page >= effectiveTotalPages}
                className="h-8 px-2.5 flex items-center gap-1 text-xs"
            >
                Next <ChevronRightIcon className="w-3.5 h-3.5" />
            </Button>
        </div>
    </div>
);

// ─── Desktop Table ────────────────────────────────────────────────────────────
const DesktopTable = ({ opportunities, selectedIds, bulkActionPending, toggleSelect, toggleSelectAll, ...actions }: Props) => (
    <div className="hidden md:flex flex-col flex-1 min-h-0 bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto custom-scrollbar overscroll-contain">
            <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10">
                    <tr className="bg-muted/80 backdrop-blur-sm border-b border-border">
                        <th className="px-4 py-3 w-10">
                            {toggleSelectAll && (
                                <Checkbox
                                    checked={selectedIds.length === opportunities.length && opportunities.length > 0}
                                    onClick={toggleSelectAll}
                                    disabled={bulkActionPending}
                                />
                            )}
                        </th>
                        <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Opportunity</th>
                        <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Location / Date</th>
                        <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                    {opportunities.map((opp) => (
                        <tr key={opp.id} className={`hover:bg-muted/40 transition-colors group ${selectedIds.includes(opp.id) ? 'bg-primary/5' : ''}`}>
                            <td className="px-4 py-3">
                                <Checkbox
                                    checked={selectedIds.includes(opp.id)}
                                    onClick={() => toggleSelect(opp.id)}
                                    disabled={bulkActionPending}
                                />
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <CompanyLogo
                                        companyName={opp.company}
                                        companyWebsite={opp.companyWebsite}
                                        companyLogoUrl={opp.companyLogoUrl}
                                        applyLink={opp.applyLink}
                                        isGovernment={opp.type === 'GOVERNMENT' || Boolean(opp.governmentJobDetails)}
                                        className="w-8 h-8 rounded-md shrink-0"
                                    />
                                    <div className="min-w-0">
                                        <button
                                            onClick={() => actions.onPreview(opp.id)}
                                            className="font-medium text-foreground hover:text-primary hover:underline text-left leading-snug truncate max-w-[280px] block"
                                        >
                                            {opp.title}
                                        </button>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-xs text-muted-foreground truncate max-w-[160px]">{opp.company}</span>
                                            <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">{opp.type}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <div className="space-y-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <MapPinIcon className="w-3 h-3 shrink-0" />
                                        <span className="truncate max-w-[180px]">{opp.locations?.join(', ') || '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <CalendarIcon className="w-3 h-3 shrink-0" />
                                        {new Date(opp.postedAt).toLocaleString()}
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${getStatusBadgeClass(opp)}`}>
                                    {getStatusLabel(opp)}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex justify-end">
                                    <RowActions opp={opp} {...actions} />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="shrink-0 px-5 py-3 border-t border-border bg-muted/20">
            <Pagination page={actions.page} effectiveTotalPages={actions.effectiveTotalPages} totalCount={actions.totalCount} pageSize={actions.pageSize} setPage={actions.setPage} />
        </div>
    </div>
);

// ─── Mobile Cards ─────────────────────────────────────────────────────────────
const MobileCards = ({ opportunities, selectedIds, toggleSelect, ...actions }: Props) => (
    <div className="md:hidden flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar overscroll-contain flex flex-col gap-2.5 pb-4 pr-1">
        {opportunities.map((opp) => {
            const isSelected = selectedIds.includes(opp.id);
            return (
                <div
                    key={opp.id}
                    className={`bg-card rounded-xl border transition-colors ${isSelected ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'}`}
                >
                    {/* Header */}
                    <div className="flex items-start gap-3 p-3">
                        <Checkbox checked={isSelected} onClick={() => toggleSelect(opp.id)} />
                        <CompanyLogo
                            companyName={opp.company}
                            companyWebsite={opp.companyWebsite}
                            companyLogoUrl={opp.companyLogoUrl}
                            applyLink={opp.applyLink}
                            isGovernment={opp.type === 'GOVERNMENT' || Boolean(opp.governmentJobDetails)}
                            className="w-9 h-9 rounded-lg shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <button
                                    onClick={() => actions.onPreview(opp.id)}
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
                                <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">{opp.type}</span>
                            </div>
                        </div>
                    </div>

                    {/* Meta */}
                    <div className="px-3 pb-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                        {opp.locations?.length > 0 && (
                            <span className="flex items-center gap-1 truncate">
                                <MapPinIcon className="w-3 h-3 shrink-0" />
                                <span className="truncate">{opp.locations.slice(0, 2).join(', ')}</span>
                            </span>
                        )}
                        <span className="flex items-center gap-1 shrink-0">
                            <CalendarIcon className="w-3 h-3" />
                            {new Date(opp.postedAt).toLocaleDateString()}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="border-t border-border/50 px-3 py-2.5">
                        <RowActions opp={opp} {...actions} />
                    </div>
                </div>
            );
        })}

        </div>
        
        {/* Pagination */}
        {opportunities.length > 0 && (
            <div className="shrink-0 pt-3 border-t border-border/40 pb-2">
                <Pagination page={actions.page} effectiveTotalPages={actions.effectiveTotalPages} totalCount={actions.totalCount} pageSize={actions.pageSize} setPage={actions.setPage} />
            </div>
        )}
    </div>
);

// ─── Unified export (replaces both Table + MobileList) ────────────────────────
export const AdminOpportunitiesTable = (props: Props) => (
    <>
        <MobileCards {...props} />
        <DesktopTable {...props} />
    </>
);

// Keep old export name working too
export const AdminOpportunitiesMobileList = (props: Props) => <MobileCards {...props} />;
