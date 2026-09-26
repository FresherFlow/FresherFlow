'use client';

import { useEffect, Suspense, useState, useCallback } from 'react';
import { useAdmin } from '@/lib/auth/AdminContext';
import { useRouter } from 'next/navigation';

// Hooks
import { useAdminOpportunities } from '@/features/admin/opportunities/hooks/useAdminOpportunities';
import { useAdminOpportunityActions } from '@/features/admin/opportunities/hooks/useAdminOpportunityActions';
import { AdminOpportunityRow } from '@/features/admin/opportunities/listUtils';

// Components
import { AdminOpportunitiesHeader } from '@/features/admin/opportunities/components/list/AdminOpportunitiesHeader';
import { AdminOpportunitiesTable } from '@/features/admin/opportunities/components/list/AdminOpportunitiesTable';
import { OPPORTUNITY_TYPE_OPTIONS, OPPORTUNITY_SORT_OPTIONS } from '@/features/admin/opportunities/columns';
import { OPPORTUNITY_STATUS_OPTIONS } from '@/features/admin/opportunities/statuses';

import { AlertDialog } from "@/ui/AlertDialog";
import { AdminOpportunityPreviewModal } from '@/features/admin/opportunities/components/list/AdminOpportunityPreviewModal';

const ALL = 'ALL';

export default function AdminOpportunitiesPage() {
    return (
        <Suspense fallback={<div className="h-full p-4 md:p-8" aria-hidden />}>
            <OpportunitiesListPage />
        </Suspense>
    );
}

function OpportunitiesListPage() {
    const { isAuthenticated } = useAdmin();
    const router = useRouter();
    const pageSize = 20;
    const [previewOppId, setPreviewOppId] = useState<string | null>(null);
    const [atsFilter, setAtsFilter] = useState<string>(ALL);

    const {
        opportunities,
        isLoading,
        hasLoadedOnce,
        typeFilter, setTypeFilter,
        statusFilter, setStatusFilter,
        search, setSearch,
        sort, setSort,
        page, setPage,
        totalCount,
        totalPages,
        exportUrl,
        loadOpportunities
    } = useAdminOpportunities(pageSize);

    const {
        selectedIds, setSelectedIds,
        bulkActionPending,
        bulkActionLabel,
        lastBulkResult,
        confirmModal, setConfirmModal,
        handleExpire,
        handleStatusUpdate,
        handleDelete,
        handleRejectDraft,
        handleHardDelete,
        handleBulkAction,
        handleRestore,
        handleCopySocialCaption
    } = useAdminOpportunityActions({ loadOpportunities, onCompleted: () => setSelectedIds([]) });

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/admin/login');
            return;
        }
        void loadOpportunities();
    }, [isAuthenticated, loadOpportunities, router]);

    /**
     * Selection is owned by the actions hook (`selectedIds` drives bulk actions
     * and the toolbar count), so the grid feeds its TanStack row selection back
     * into it rather than duplicating the state.
     */
    const handleSelectedRowsChange = useCallback(
        (rows: AdminOpportunityRow[]) => setSelectedIds(rows.map((row) => row.id)),
        [setSelectedIds]
    );

    const handleClearFilters = useCallback(() => {
        setSearch('');
        setTypeFilter('');
        setStatusFilter('');
        setSort('postedAt_desc');
        setAtsFilter(ALL);
        setPage(1);
    }, [setSearch, setTypeFilter, setStatusFilter, setSort, setPage]);

    const effectiveTotalPages = totalPages || Math.ceil(totalCount / pageSize) || 1;

    return (
        <div className="h-full overflow-hidden p-4 md:p-8 flex-1 flex flex-col gap-3">
            <AdminOpportunitiesHeader
                isLoading={isLoading}
                onRefresh={loadOpportunities}
                exportUrl={exportUrl}
                search={search}
                setSearch={setSearch}
            />

            {lastBulkResult && (
                <div className="shrink-0 rounded-lg border border-border bg-card/70 px-3 py-2 text-xs text-muted-foreground">
                    Last bulk {lastBulkResult.action.toLowerCase()}: {lastBulkResult.updatedCount} updated ({new Date(lastBulkResult.at).toLocaleTimeString()}).
                </div>
            )}

            {/* Unified grid — desktop table + mobile rows, search, sorting,
                selection, pagination, loading and empty states. */}
            <AdminOpportunitiesTable
                opportunities={opportunities}
                isLoading={isLoading && !hasLoadedOnce}
                totalCount={totalCount}
                page={page}
                pageSize={pageSize}
                totalPages={effectiveTotalPages}
                onPageChange={setPage}
                sort={sort}
                onSortChange={setSort}
                statusFilter={statusFilter}
                onStatusChange={(value) => { setStatusFilter(value); setPage(1); }}
                statusOptions={OPPORTUNITY_STATUS_OPTIONS}
                atsFilter={atsFilter}
                onAtsFilterChange={(value) => { setAtsFilter(value); setPage(1); }}
                showTypeFilter
                typeFilter={typeFilter}
                onTypeChange={(value) => { setTypeFilter(value); setPage(1); }}
                typeOptions={OPPORTUNITY_TYPE_OPTIONS}
                onRefresh={loadOpportunities}
                onClearFilters={handleClearFilters}
                enableSelection
                onSelectedRowsChange={handleSelectedRowsChange}
                onPreview={setPreviewOppId}
                onCopyCaption={handleCopySocialCaption}
                onStatusUpdate={handleStatusUpdate}
                onRejectDraft={handleRejectDraft}
                onExpire={handleExpire}
                onDelete={handleDelete}
                onHardDelete={handleHardDelete}
                onRestore={handleRestore}
                bulkActionPending={bulkActionPending}
                bulkActionLabel={bulkActionLabel}
                onBulkAction={handleBulkAction}
                title="Listings"
                description="Every job, internship, walk-in and government listing"
                emptyMessage="No listings match the current filters."
            />

            <AlertDialog 
                show={confirmModal.show}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.action}
                onCancel={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                type={confirmModal.type}
                confirmText={confirmModal.confirmText}
                requireReason={confirmModal.requireReason}
                reasonPlaceholder={confirmModal.reasonPlaceholder}
                statusOptions={confirmModal.statusOptions}
                defaultStatus={confirmModal.defaultStatus}
            />

            <AdminOpportunityPreviewModal
                show={!!previewOppId}
                opportunityId={previewOppId}
                onClose={() => setPreviewOppId(null)}
            />
        </div>
    );
}
