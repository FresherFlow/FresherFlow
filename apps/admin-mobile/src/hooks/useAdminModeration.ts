import { useState, useCallback, useRef } from 'react';
import { adminOpportunitiesApi } from '@fresherflow/api-client';
import { toast } from '../lib/toast';
import * as Haptics from 'expo-haptics';

interface QueuedAction {
    id: string;
    type: 'approve' | 'reject';
    run: () => Promise<unknown>;
    attempts: number;
}

export function useAdminModeration() {
    const [isModerating, setIsModerating] = useState(false);
    const retryQueue = useRef<QueuedAction[]>([]);

    const executeWithRetry = useCallback(async (action: QueuedAction) => {
        try {
            await action.run();
            // Success! Remove from queue if it was in it
            retryQueue.current = retryQueue.current.filter((item) => item.id !== action.id);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toast.success(
                'Success', 
                action.type === 'approve' ? 'Submission Approved Successfully' : 'Submission Rejected Successfully'
            );
        } catch (error: unknown) {
            const err = error as { status?: number; response?: { status?: number }; message?: string };
            const status = err?.status || err?.response?.status;
            const isTimeout = status === 408 || status === 504 || err?.message?.toLowerCase().includes('timeout') || err?.message?.toLowerCase().includes('network');

            if (isTimeout && action.attempts < 2) {
                action.attempts += 1;
                // Add to queue if not already there
                if (!retryQueue.current.some((item) => item.id === action.id)) {
                    retryQueue.current.push(action);
                }
                
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                toast.info('Action Pending', 'Retrying Connection...');

                // Schedule rerun after 5 seconds
                setTimeout(() => {
                    void executeWithRetry(action);
                }, 5000);
            } else {
                // Completely failed after retries or non-timeout error
                retryQueue.current = retryQueue.current.filter((item) => item.id !== action.id);
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                toast.error(
                    'Connection Timeout', 
                    'Please try again later'
                );
            }
        }
    }, []);

    const approveOpportunity = useCallback(
        async (id: string, payload?: unknown) => {
            setIsModerating(true);
            const action: QueuedAction = {
                id,
                type: 'approve',
                attempts: 0,
                run: () => adminOpportunitiesApi.ingestDraft(payload || { id }),
            };
            await executeWithRetry(action);
            setIsModerating(false);
        },
        [executeWithRetry]
    );

    const rejectOpportunity = useCallback(
        async (id: string) => {
            setIsModerating(true);
            const action: QueuedAction = {
                id,
                type: 'reject',
                attempts: 0,
                run: () => adminOpportunitiesApi.rejectSubmission(id),
            };
            await executeWithRetry(action);
            setIsModerating(false);
        },
        [executeWithRetry]
    );

    return {
        approveOpportunity,
        rejectOpportunity,
        isModerating,
        queueSize: retryQueue.current.length,
    };
}
