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
    // Owned here, not hardcoded: the grid's rows-per-page control has to be able
    // to change the server query, otherwise it renders but does nothing.
    const [pageSize, setPageSize] = useState(20);
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
        setSelectedIds,
        bulkActionPending,
        bulkActionLabel,
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
     * Selection is owned by the actions hook (drives bulk actions), so the
     * grid feeds its TanStack row selection back into it rather than
     * duplicating the state.
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
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 md:p-8">
            <AdminOpportunitiesHeader
                exportUrl={exportUrl}
                onRefresh={loadOpportunities}
                isRefreshing={isLoading}
            />

            {/* Unified grid — sticky identity columns + horizontal
                scroll on mobile, search, sorting, selection, bulk bar,
                pagination, loading and empty states. */}
            <AdminOpportunitiesTable
                opportunities={opportunities}
                isLoading={isLoading && !hasLoadedOnce}
                totalCount={totalCount}
                page={page}
                pageSize={pageSize}
                totalPages={effectiveTotalPages}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
                sort={sort}
                onSortChange={setSort}
                sortOptions={OPPORTUNITY_SORT_OPTIONS}
                searchValue={search}
                onSearchChange={setSearch}
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
