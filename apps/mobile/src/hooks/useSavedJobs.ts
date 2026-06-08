import { useState, useCallback } from 'react';
import { } from 'react-native';
import { useSaved } from '@repo/frontend-core';
import { useToast } from '@/contexts/ToastContext';

export const useSavedJobs = () => {
    const { savedJobs, savedResources, toggleSaveResource, isSavedResource, syncSavedJobs, syncSavedResources } = useSaved();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    
    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            if (syncSavedJobs) {
                await syncSavedJobs();
            }
            if (syncSavedResources) {
                await syncSavedResources();
            }
        } finally {
            setLoading(false);
        }
    }, [syncSavedJobs]);

    const clearAll = () => {
        showToast('Bulk clear is not yet implemented.', 'info');
    };

    return {
        savedJobs,
        savedResources,
        toggleSaveResource,
        isSavedResource,
        loading,
        refresh,
        clearAll,
    };
};

