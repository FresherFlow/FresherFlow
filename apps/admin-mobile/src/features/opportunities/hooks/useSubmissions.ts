import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminOpportunitiesApi } from '@fresherflow/api-client';
import { RawOpportunity } from '@fresherflow/types';
import { toast } from '../../../lib/toast';
import * as Haptics from 'expo-haptics';

/**
 * Hook for managing raw job submissions from users.
 * Uses useQuery for standardized caching and local-first data availability.
 */
export const useSubmissions = () => {
    const queryClient = useQueryClient();

    const {
        data: submissions = [],
        isLoading: loading,
        isRefetching: refreshing,
        error: queryError,
        refetch: fetchSubmissions,
    } = useQuery({
        queryKey: ['admin', 'submissions'],
        queryFn: async () => {
            const data = await adminOpportunitiesApi.getSubmissions();
            return data.submissions || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const onRefresh = useCallback(() => {
        void fetchSubmissions();
    }, [fetchSubmissions]);

    const rejectMutation = useMutation({
        mutationFn: (id: string) => adminOpportunitiesApi.rejectSubmission(id),
        onMutate: async (id) => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: ['admin', 'submissions'] });
            const previous = queryClient.getQueryData<RawOpportunity[]>(['admin', 'submissions']);
            queryClient.setQueryData<RawOpportunity[]>(['admin', 'submissions'], old => old?.filter(s => s.id !== id));
            return { previous };
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['admin', 'submissions'], context?.previous);
            toast.error('Failed', 'Could not reject submission');
        },
        onSuccess: () => {
            toast.success('Rejected', 'Submission has been rejected');
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: ['admin', 'submissions'] });
        }
    });

    return {
        submissions,
        loading,
        refreshing,
        error: queryError ? (queryError as Error).message : null,
        onRefresh,
        rejectSubmission: rejectMutation.mutate,
        fetchSubmissions,
    };
};
