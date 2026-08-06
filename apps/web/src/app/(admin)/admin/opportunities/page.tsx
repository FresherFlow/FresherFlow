'use client';

import { useEffect, Suspense, useState } from 'react';
import { useAdmin } from '@/lib/auth/AdminContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import { AdminOpportunitiesSkeleton } from '@/ui/Skeleton';

// Hooks
import { useAdminOpportunities } from './hooks/useAdminOpportunities';
import { useAdminOpportunityActions } from './hooks/useAdminOpportunityActions';

// Components
import { AdminOpportunitiesHeader } from './components/AdminOpportunitiesHeader';
import { AdminBulkActionsBar } from './components/AdminBulkActionsBar';
import { AdminOpportunitiesFilters } from './components/AdminOpportunitiesFilters';
import { AdminOpportunitiesTable } from './components/AdminOpportunitiesTable';
import { AdminOpportunitiesMobileList } from './components/AdminOpportunitiesMobileList';
import { ConfirmModal } from './components/ConfirmModal';
import { AdminOpportunityPreviewModal } from './components/AdminOpportunityPreviewModal';

export default function AdminOpportunitiesPage() {
    return (
        <Suspense fallback={<AdminOpportunitiesSkeleton />}>
            <OpportunitiesListPage />
        </Suspense>
    );
}

function OpportunitiesListPage() {
    const { isAuthenticated } = useAdmin();
    const router = useRouter();
    const pageSize = 20;
    const [previewOppId, setPreviewOppId] = useState<string | null>(null);

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
    } = useAdminOpportunityActions(loadOpportunities);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/admin/login');
            return;
        }
        void loadOpportunities();
    }, [isAuthenticated, loadOpportunities, router]);

    const effectiveTotalPages = totalPages || Math.ceil(totalCount / pageSize) || 1;

    return (
        <div className="min-h-full overflow-y-auto pb-32 md:pb-8 p-4 md:p-8 pt-16 md:pt-8 space-y-6 flex-1 flex flex-col">
            <AdminOpportunitiesHeader 
                isLoading={isLoading} 
                onRefresh={loadOpportunities} 
                exportUrl={exportUrl} 
            />

            {lastBulkResult && (
                <div className="rounded-lg border border-border bg-card/70 px-3 py-2 text-xs text-muted-foreground">
                    Last bulk {lastBulkResult.action.toLowerCase()}: {lastBulkResult.updatedCount} updated ({new Date(lastBulkResult.at).toLocaleTimeString()}).
                </div>
            )}

            <AdminBulkActionsBar 
                selectedCount={selectedIds.length}
                bulkActionPending={bulkActionPending}
                bulkActionLabel={bulkActionLabel}
                onAction={handleBulkAction}
                onClear={() => setSelectedIds([])}
            />

            <AdminOpportunitiesFilters 
                search={search} setSearch={setSearch}
                typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                sort={sort} setSort={setSort}
                onClear={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setSort('postedAt_desc'); setPage(1); }}
            />

            {/* Table area — grows to fill remaining height */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {!hasLoadedOnce && isLoading ? (
                    <AdminOpportunitiesSkeleton />
                ) : opportunities.length === 0 ? (
                    <div className="bg-card border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground">
                        No results found.
                    </div>
                ) : (
                    <>
                        <AdminOpportunitiesMobileList 
                            opportunities={opportunities}
                            selectedIds={selectedIds}
                            toggleSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                            handleExpire={handleExpire}
                            handleStatusUpdate={handleStatusUpdate}
                            handleDelete={handleDelete}
                            handleHardDelete={handleHardDelete}
                            handleRejectDraft={handleRejectDraft}
                            handleRestore={handleRestore}
                            copySocialCaption={handleCopySocialCaption}
                            onPreview={setPreviewOppId}
                            page={page}
                            pageSize={pageSize}
                            totalCount={totalCount}
                            effectiveTotalPages={effectiveTotalPages}
                            setPage={setPage}
                        />

                        <AdminOpportunitiesTable 
                            opportunities={opportunities}
                            selectedIds={selectedIds}
                            bulkActionPending={bulkActionPending}
                            toggleSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                            toggleSelectAll={() => setSelectedIds(selectedIds.length === opportunities.length ? [] : opportunities.map(o => o.id))}
                            handleExpire={handleExpire}
                            handleStatusUpdate={handleStatusUpdate}
                            handleDelete={handleDelete}
                            handleHardDelete={handleHardDelete}
                            handleRejectDraft={handleRejectDraft}
                            handleRestore={handleRestore}
                            copySocialCaption={handleCopySocialCaption}
                            onPreview={setPreviewOppId}
                            page={page}
                            pageSize={pageSize}
                            totalCount={totalCount}
                            effectiveTotalPages={effectiveTotalPages}
                            setPage={setPage}
                        />
                    </>
                )}
            </div>

            <ConfirmModal 
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
