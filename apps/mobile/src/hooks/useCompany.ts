import { useState, useCallback, useEffect } from 'react';
import { Opportunity } from '@fresherflow/types';
import { findJobsByCompanyLocally } from '@/utils/offlineCache';

export function useCompany(companyName: string, initialJob?: Opportunity) {
    const [jobs, setJobs] = useState<Opportunity[]>(initialJob ? [initialJob] : []);
    const [loading, setLoading] = useState(!initialJob);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const localJobs = await findJobsByCompanyLocally(companyName);

            // Merge initialJob if not already in local results
            let finalJobs = [...localJobs];
            if (initialJob && !finalJobs.find(j => j.id === initialJob.id)) {
                finalJobs = [initialJob, ...finalJobs];
            }

            setJobs(finalJobs);
        } catch (error) {
            console.error('Local company job lookup failed:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [companyName, initialJob]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    return {
        jobs,
        loading,
        refreshing,
        onRefresh: () => void loadData(),
    };
}
