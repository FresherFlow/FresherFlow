import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { actionsApi } from '@fresherflow/api-client';
import { ActionType } from '@fresherflow/types';
import { readTrackerCacheSync, saveTrackerCache } from '@/utils/offlineCache';
import { enqueueOfflineActionTrack, enqueueOfflineActionRemove } from '@repo/frontend-core';
import { useAuthStore } from '@/store/useAuthStore';
import * as Haptics from 'expo-haptics';

export const useTracker = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    // Dynamic cache-first query matching
    const {
        data: items = [],
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['tracker'],
        queryFn: async () => {
            const response = await actionsApi.list() as { actions: unknown[] };
            const actions = response.actions || [];
            
            // Persistence
            void saveTrackerCache(actions);
            
            return actions;
        },
        initialData: () => {
            const cached = readTrackerCacheSync();
            return cached?.items || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache validity
    });

    const onRefresh = useCallback(async () => {
        setIsManualRefreshing(true);
        await refetch();
        setIsManualRefreshing(false);
    }, [refetch]);

    const isTracking = useCallback((opportunityId: string) => {
        return items.some(item => {
            const tItem = item as { opportunityId?: string; opportunity?: { id?: string } };
            return tItem.opportunityId === opportunityId || tItem.opportunity?.id === opportunityId;
        });
    }, [items]);

    const getStatus = useCallback((opportunityId: string): ActionType | null => {
        const item = items.find(item => {
            const tItem = item as { opportunityId?: string; opportunity?: { id?: string } };
            return tItem.opportunityId === opportunityId || tItem.opportunity?.id === opportunityId;
        }) as { actionType?: ActionType } | undefined;
        return item?.actionType || null;
    }, [items]);

    // Optimistic mutation tracking
    const trackMutation = useMutation({
        mutationFn: ({ opportunityId, status }: { opportunityId: string, status: ActionType, opportunity?: import('@fresherflow/types').Opportunity }) => 
            actionsApi.track(opportunityId, status),
        onMutate: async ({ opportunityId, status, opportunity }) => {
            await queryClient.cancelQueries({ queryKey: ['tracker'] });
            const previousActions = queryClient.getQueryData<unknown[]>(['tracker']) || [];

            const updatedActions = [...previousActions];
            const index = updatedActions.findIndex(item => {
                const tItem = item as { opportunityId?: string; opportunity?: { id?: string } };
                return tItem.opportunityId === opportunityId || tItem.opportunity?.id === opportunityId;
            });

            if (index > -1) {
                updatedActions[index] = {
                    ...(updatedActions[index] as Record<string, unknown>),
                    actionType: status,
                };
            } else {
                updatedActions.unshift({
                    id: `temp-${opportunityId}-${Date.now()}`,
                    actionType: status,
                    createdAt: new Date().toISOString(),
                    opportunityId,
                    opportunity: opportunity || undefined,
                });
            }

            queryClient.setQueryData(['tracker'], updatedActions);
            void saveTrackerCache(updatedActions);

            return { previousActions };
        },
        onError: (err: unknown, variables, context) => {
            const error = err as { name?: string; message?: string };
            const isOffline = error?.name === 'OfflineError' || error?.message?.toLowerCase().includes('offline') || error?.message?.toLowerCase().includes('network error');
            if (isOffline && user) {
                console.log('[Tracker] Offline detected during track status. Enqueueing offline action track...', variables);
                void enqueueOfflineActionTrack(variables.opportunityId, variables.status, user.id);
                // Keep the optimistic update in the local cache!
                return;
            }

            if (context?.previousActions) {
                queryClient.setQueryData(['tracker'], context.previousActions);
                void saveTrackerCache(context.previousActions);
            }
        },
        onSettled: (data, err) => {
            const error = err as { name?: string; message?: string } | null;
            const isOffline = error?.name === 'OfflineError' || error?.message?.toLowerCase().includes('offline') || error?.message?.toLowerCase().includes('network error');
            if (!isOffline) {
                void queryClient.invalidateQueries({ queryKey: ['tracker'] });
            }
        }
    });

    const removeMutation = useMutation({
        mutationFn: (opportunityId: string) => actionsApi.remove(opportunityId),
        onMutate: async (opportunityId) => {
            await queryClient.cancelQueries({ queryKey: ['tracker'] });
            const previousActions = queryClient.getQueryData<unknown[]>(['tracker']) || [];

            const updatedActions = previousActions.filter(item => {
                const tItem = item as { opportunityId?: string; opportunity?: { id?: string } };
                return tItem.opportunityId !== opportunityId && tItem.opportunity?.id !== opportunityId;
            });

            queryClient.setQueryData(['tracker'], updatedActions);
            void saveTrackerCache(updatedActions);

            return { previousActions };
        },
        onError: (err: unknown, opportunityId, context) => {
            const error = err as { name?: string; message?: string };
            const isOffline = error?.name === 'OfflineError' || error?.message?.toLowerCase().includes('offline') || error?.message?.toLowerCase().includes('network error');
            if (isOffline && user) {
                console.log('[Tracker] Offline detected during remove action. Enqueueing offline action remove...', opportunityId);
                void enqueueOfflineActionRemove(opportunityId, user.id);
                // Keep the optimistic update in the local cache!
                return;
            }

            if (context?.previousActions) {
                queryClient.setQueryData(['tracker'], context.previousActions);
                void saveTrackerCache(context.previousActions);
            }
        },
        onSettled: (data, err) => {
            const error = err as { name?: string; message?: string } | null;
            const isOffline = error?.name === 'OfflineError' || error?.message?.toLowerCase().includes('offline') || error?.message?.toLowerCase().includes('network error');
            if (!isOffline) {
                void queryClient.invalidateQueries({ queryKey: ['tracker'] });
            }
        }
    });

    const toggleTracking = useCallback(async (opportunity: import('@fresherflow/types').Opportunity, status?: ActionType) => {
        const currentlyTracking = isTracking(opportunity.id);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        if (currentlyTracking && !status) {
            await removeMutation.mutateAsync(opportunity.id);
        } else {
            const targetStatus = status || ActionType.PLANNED;
            await trackMutation.mutateAsync({ opportunityId: opportunity.id, status: targetStatus, opportunity });
        }
    }, [isTracking, trackMutation, removeMutation]);

    const updateStatus = useCallback(async (opportunityId: string, status: ActionType) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await trackMutation.mutateAsync({ opportunityId, status });
    }, [trackMutation]);

    const removeAction = useCallback(async (opportunityId: string) => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        await removeMutation.mutateAsync(opportunityId);
    }, [removeMutation]);

    return {
        actions: items,
        loading: isLoading && items.length === 0,
        refreshing: isManualRefreshing,
        error: error ? (error as Error).message : null,
        refresh: onRefresh,
        isTracking,
        getStatus,
        toggleTracking,
        updateStatus,
        removeAction,
        updating: trackMutation.isPending || removeMutation.isPending,
    };
};
