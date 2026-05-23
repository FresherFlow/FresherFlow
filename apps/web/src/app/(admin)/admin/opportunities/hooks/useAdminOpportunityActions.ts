import { useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api/admin';
import { buildSocialCaption } from '@/features/admin/opportunities/listUtils';

import { SocialOpportunity } from '@/features/admin/opportunities/listUtils';

export function useAdminOpportunityActions(loadOpportunities: () => Promise<void>) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkActionPending, setBulkActionPending] = useState(false);
    const [bulkActionLabel, setBulkActionLabel] = useState('');
    const [lastBulkResult, setLastBulkResult] = useState<{
        action: string;
        requestedCount: number;
        updatedCount: number;
        skippedCount: number;
        at: number;
    } | null>(null);

    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        action: (reason?: string) => void;
        type: 'danger' | 'warning';
        confirmText: string;
        requireReason?: boolean;
        reasonPlaceholder?: string;
    }>({
        show: false,
        title: '',
        message: '',
        action: () => { },
        type: 'warning',
        confirmText: 'Confirm',
        requireReason: false,
    });

    const handleExpire = (id: string, title: string) => {
        setConfirmModal({
            show: true,
            title: 'Expire Opportunity',
            message: `Are you sure you want to mark "${title}" as EXPIRED?`,
            type: 'warning',
            confirmText: 'Expire listing',
            action: async () => {
                const tid = toast.loading('Updating status...');
                try {
                    await adminApi.expireOpportunity(id);
                    toast.success('Opportunity expired', { id: tid });
                    loadOpportunities();
                    setConfirmModal(prev => ({ ...prev, show: false }));
                } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : 'An error occurred', { id: tid });
                }
            }
        });
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        const tid = toast.loading(`Updating to ${newStatus}...`);
        try {
            await adminApi.updateOpportunityStatus(id, newStatus);
            toast.success('Listing updated', { id: tid });
            loadOpportunities();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'An error occurred', { id: tid });
        }
    };

    const handleDelete = (id: string, title: string) => {
        setConfirmModal({
            show: true,
            title: 'Remove Opportunity',
            message: `Remove "${title}"? The reason you type will be shown to the user who shared it.`,
            type: 'danger',
            confirmText: 'Remove listing',
            requireReason: true,
            reasonPlaceholder: 'e.g. Job listing is expired, Duplicate entry...',
            action: async (reason?: string) => {
                const tid = toast.loading('Removing listing...');
                try {
                    await adminApi.deleteOpportunity(id, reason || 'Removed by admin');
                    toast.success('Opportunity removed', { id: tid });
                    loadOpportunities();
                    setConfirmModal(prev => ({ ...prev, show: false }));
                } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : 'An error occurred', { id: tid });
                }
            }
        });
    };

    const handleRejectDraft = (id: string, title: string) => {
        setConfirmModal({
            show: true,
            title: 'Reject Draft',
            message: `Reject "${title}"? The reason will be shown to the contributor.`,
            type: 'danger',
            confirmText: 'Reject',
            requireReason: true,
            reasonPlaceholder: 'e.g. Job listing is expired, Not relevant for freshers...',
            action: async (reason?: string) => {
                const tid = toast.loading('Rejecting...');
                try {
                    await adminApi.rejectOpportunity(id, reason || 'Rejected by admin');
                    toast.success('Draft rejected', { id: tid });
                    loadOpportunities();
                    setConfirmModal(prev => ({ ...prev, show: false }));
                } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : 'An error occurred', { id: tid });
                }
            }
        });
    };

    const handleBulkAction = async (action: 'DELETE' | 'ARCHIVE' | 'PUBLISH' | 'EXPIRE') => {
        const labels = { DELETE: 'remove', ARCHIVE: 'archive', PUBLISH: 'publish', EXPIRE: 'expire' };
        setConfirmModal({
            show: true,
            title: `Bulk ${action}`,
            message: `Apply ${labels[action]} to ${selectedIds.length} listings?`,
            type: action === 'DELETE' ? 'danger' : 'warning',
            confirmText: 'Apply all',
            action: async () => {
                const tid = toast.loading(`Processing...`);
                try {
                    setBulkActionPending(true);
                    setBulkActionLabel(labels[action]);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const res = await adminApi.bulkAction(selectedIds, action) as any;
                    setLastBulkResult({ 
                        action, 
                        requestedCount: res.requestedCount || selectedIds.length, 
                        updatedCount: res.updatedCount || 0, 
                        skippedCount: res.skippedCount || 0, 
                        at: Date.now() 
                    });
                    toast.success('Bulk action complete', { id: tid });
                    setSelectedIds([]);
                    loadOpportunities();
                    setConfirmModal(prev => ({ ...prev, show: false }));
                } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : 'An error occurred', { id: tid });
                } finally {
                    setBulkActionPending(false);
                }
            }
        });
    };

    const handleRestore = async (id: string) => {
        const tid = toast.loading('Restoring listing...');
        try {
            await adminApi.restoreOpportunity(id);
            toast.success('Listing restored', { id: tid });
            loadOpportunities();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'An error occurred', { id: tid });
        }
    };

    const handleCopySocialCaption = async (opp: SocialOpportunity) => {
        try {
            await navigator.clipboard.writeText(buildSocialCaption(opp));
            toast.success('Caption copied.');
        } catch {
            toast.error('Failed to copy.');
        }
    };

    return {
        selectedIds, setSelectedIds,
        bulkActionPending,
        bulkActionLabel,
        lastBulkResult,
        confirmModal, setConfirmModal,
        handleExpire,
        handleStatusUpdate,
        handleDelete,
        handleRejectDraft,
        handleBulkAction,
        handleRestore,
        handleCopySocialCaption
    };
}





