import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminOpportunitiesApi } from '@fresherflow/api-client';
import NetInfo from '@react-native-community/netinfo';
import { toast } from '../../../lib/toast';

interface PendingPost {
    id: string;
    payload: Record<string, unknown>;
    isEditing: boolean;
    targetId?: string;
    createdAt: number;
}

interface PostSyncState {
    queue: PendingPost[];
    isSyncing: boolean;
    addToQueue: (payload: Record<string, unknown>, isEditing: boolean, targetId?: string) => void;
    syncQueue: () => Promise<void>;
}

export const usePostSyncStore = create<PostSyncState>()(
    persist(
        (set, get) => ({
            queue: [],
            isSyncing: false,

            addToQueue: (payload, isEditing, targetId) => {
                const id = Math.random().toString(36).substring(7);
                set(state => ({
                    queue: [...state.queue, { id, payload, isEditing, targetId, createdAt: Date.now() }]
                }));
            },

            syncQueue: async () => {
                const { queue, isSyncing } = get();
                if (isSyncing || queue.length === 0) return;

                set({ isSyncing: true });

                const remaining = [...queue];
                const processedIds: string[] = [];

                for (const item of remaining) {
                    try {
                        if (item.isEditing && item.targetId) {
                            await adminOpportunitiesApi.update(item.targetId, item.payload);
                        } else {
                            await adminOpportunitiesApi.create(item.payload);
                        }
                        processedIds.push(item.id);
                    } catch (error) {
                        console.error('[SyncError]', error);
                        // Stop processing queue on first error to avoid spamming if network is still bad
                        break;
                    }
                }

                if (processedIds.length > 0) {
                    set(state => ({
                        queue: state.queue.filter(q => !processedIds.includes(q.id))
                    }));
                    toast.success('Sync Complete', `Successfully posted ${processedIds.length} pending items.`);
                }

                set({ isSyncing: false });
            },
        }),
        {
            name: 'admin-post-sync-queue',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

// Auto-trigger sync on network recovery
NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable) {
        void usePostSyncStore.getState().syncQueue();
    }
});
