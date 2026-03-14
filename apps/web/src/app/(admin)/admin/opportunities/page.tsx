'use client';

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import type { Opportunity } from '@fresherflow/types';
import toast from 'react-hot-toast';
import { AdminOpportunitiesSkeleton } from '@/components/ui/Skeleton';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { getPublicOpportunityHref } from '@/features/admin/opportunities/listUtils';

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
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
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
                        handleRestore={handleRestore}
                        copySocialCaption={handleCopySocialCaption}
                        getPublicOpportunityHref={getPublicOpportunityHref}
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
                        handleRestore={handleRestore}
                        copySocialCaption={handleCopySocialCaption}
                        getPublicOpportunityHref={getPublicOpportunityHref}
                        page={page}
                        pageSize={pageSize}
                        totalCount={totalCount}
                        effectiveTotalPages={effectiveTotalPages}
                        setPage={setPage}
                    />
                </>
            )}

            <ConfirmModal 
                show={confirmModal.show}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.action}
                onCancel={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                type={confirmModal.type}
                confirmText={confirmModal.confirmText}
            />
        </div>
    );
}
