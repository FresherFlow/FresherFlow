import { useState } from 'react';
import toast from 'react-hot-toast';
import {
    expireOpportunityAction,
    updateOpportunityAction,
    deleteOpportunityAction,
    bulkOpportunityAction,
    restoreOpportunityAction
} from '@/features/jobs/actions/opportunity';
import { buildSocialCaption } from '@/features/admin/opportunities/listUtils';

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
        action: () => void;
        type: 'danger' | 'warning';
        confirmText: string;
    }>({
        show: false,
        title: '',
        message: '',
        action: () => { },
        type: 'warning',
        confirmText: 'Confirm'
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
                    const res = await expireOpportunityAction(id);
                    if (!res.success) throw new Error(res.error);
                    toast.success('Opportunity expired', { id: tid });
                    loadOpportunities();
                    setConfirmModal(prev => ({ ...prev, show: false }));
                } catch (err: any) {
                    toast.error(err.message, { id: tid });
                }
            }
        });
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        const tid = toast.loading(`Updating to ${newStatus}...`);
        try {
            const res = await updateOpportunityAction(id, { status: newStatus as any });
            if (!res.success) throw new Error(res.error);
            toast.success('Listing updated', { id: tid });
            loadOpportunities();
        } catch (err: any) {
            toast.error(err.message, { id: tid });
        }
    };

    const handleDelete = (id: string, title: string) => {
        setConfirmModal({
            show: true,
            title: 'Remove Opportunity',
            message: `DANGER: Are you sure you want to REMOVE "${title}"?`,
            type: 'danger',
            confirmText: 'Remove listing',
            action: async () => {
                const tid = toast.loading('Removing listing...');
                try {
                    const res = await deleteOpportunityAction(id, 'Removed by admin');
                    if (!res.success) throw new Error(res.error);
                    toast.success('Opportunity removed', { id: tid });
                    loadOpportunities();
                    setConfirmModal(prev => ({ ...prev, show: false }));
                } catch (err: any) {
                    toast.error(err.message, { id: tid });
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
                    const res = await bulkOpportunityAction(selectedIds, action);
                    if (!res.success) throw new Error(res.error);
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
                } catch (err: any) {
                    toast.error(err.message, { id: tid });
                } finally {
                    setBulkActionPending(false);
                }
            }
        });
    };

    const handleRestore = async (id: string) => {
        const tid = toast.loading('Restoring listing...');
        try {
            const res = await restoreOpportunityAction(id);
            if (!res.success) throw new Error(res.error);
            toast.success('Listing restored', { id: tid });
            loadOpportunities();
        } catch (err: any) {
            toast.error(err.message, { id: tid });
        }
    };

    const handleCopySocialCaption = async (opp: any) => {
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
        handleBulkAction,
        handleRestore,
        handleCopySocialCaption
    };
}
