import { useState, useCallback, useEffect } from 'react';
import { opportunitiesApi } from '@fresherflow/api-client';
import { Opportunity } from '@fresherflow/types';

export function useCompany(companyName: string) {
    const [jobs, setJobs] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchJobs = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await opportunitiesApi.list({ 
                company: companyName
            }) as { opportunities: Opportunity[] };
            
            if (response && Array.isArray(response.opportunities)) {
                setJobs(response.opportunities);
            }
        } catch (error) {
            console.error('Failed to fetch company jobs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [companyName]);

    useEffect(() => {
        void fetchJobs();
    }, [fetchJobs]);

    return {
        jobs,
        loading,
        refreshing,
        onRefresh: () => void fetchJobs(true),
    };
}
