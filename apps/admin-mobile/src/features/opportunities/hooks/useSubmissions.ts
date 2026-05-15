import { useState, useCallback, useEffect } from 'react';
import { adminOpportunitiesApi } from '@fresherflow/api-client';
import { RawOpportunity } from '@fresherflow/types';
import { toast } from '../../../lib/toast';
import * as Haptics from 'expo-haptics';

export const useSubmissions = () => {
    const [submissions, setSubmissions] = useState<RawOpportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSubmissions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await adminOpportunitiesApi.getSubmissions();
            setSubmissions(data.submissions || []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to fetch submissions');
            toast.error('Error', 'Could not load submissions');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        void fetchSubmissions();
    }, [fetchSubmissions]);

    const rejectSubmission = useCallback(async (id: string) => {
        try {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await adminOpportunitiesApi.rejectSubmission(id);
            setSubmissions(prev => prev.filter(s => s.id !== id));
            toast.success('Rejected', 'Submission has been rejected');
        } catch {
            toast.error('Failed', 'Could not reject submission');
        }
    }, []);

    useEffect(() => {
        void fetchSubmissions();
    }, [fetchSubmissions]);

    return {
        submissions,
        loading,
        refreshing,
        error,
        onRefresh,
        rejectSubmission,
        fetchSubmissions,
    };
};
