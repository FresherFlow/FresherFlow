import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useSaved } from '@repo/frontend-core';

export const useSavedJobs = () => {
    const { savedJobs, syncSavedJobs } = useSaved();
    const [loading, setLoading] = useState(false);
    
    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            if (syncSavedJobs) {
                await syncSavedJobs();
            }
        } finally {
            setLoading(false);
        }
    }, [syncSavedJobs]);

    const clearAll = () => {
        Alert.alert('Coming Soon', 'Bulk clear is not yet implemented.');
    };

    return {
        savedJobs,
        loading,
        refresh,
        clearAll,
    };
};

