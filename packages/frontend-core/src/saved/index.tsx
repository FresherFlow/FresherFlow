import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Opportunity, OpportunityListResponse } from '@fresherflow/types';
import { readSavedJobs, saveSavedJobs, enqueueOfflineSaveToggle, subscribeOfflineActionQueue, getPendingOfflineActionsCount } from '../offline';

import { savedApi } from '@fresherflow/api-client';
import { secureStorage } from '../lib/storage';

interface SavedContextType {
  savedJobs: (Opportunity & { needsSync?: boolean })[];
  toggleSave: (job: Opportunity) => void;
  isSaved: (jobId: string) => boolean;
  hasPendingSync: boolean;
  syncSavedJobs: () => Promise<void>;
}

const SavedContext = createContext<SavedContextType | undefined>(undefined);

export const SavedProvider: React.FC<{ 
  children: React.ReactNode,
  userId?: string,
  anonSessionId?: string | null
}> = ({ children, userId, anonSessionId }) => {
  const [savedJobs, setSavedJobs] = useState<(Opportunity & { needsSync?: boolean })[]>([]);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const ownerId = userId || anonSessionId || undefined;

  const updatePendingCount = useCallback(async () => {
    const count = await getPendingOfflineActionsCount(ownerId);
    setHasPendingSync(count > 0);
  }, [ownerId]);

  const syncSavedJobs = async () => {
    try {
      // GUARD: Don't sync if guest and no anon ID
      const token = await secureStorage.getItemAsync('ff_auth_token_v1');
      if (!token && !anonSessionId) return;

      const response = await savedApi.list() as OpportunityListResponse;
      if (response && response.opportunities) {
        setSavedJobs(response.opportunities);
        void saveSavedJobs(response.opportunities);
        await updatePendingCount();
      }
    } catch {
      // User likely logged out or offline, silently ignore
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const cached = await readSavedJobs();
      setSavedJobs(cached);
      await updatePendingCount();
      // Attempt backend sync in background
      void syncSavedJobs();
    };
    void bootstrap();

    return subscribeOfflineActionQueue(() => {
      void updatePendingCount();
    });
  }, [updatePendingCount]);

  const toggleSave = async (job: Opportunity) => {
    let updated: (Opportunity & { needsSync?: boolean })[];
    const isAlreadySaved = savedJobs.some((j) => j.id === job.id);

    if (isAlreadySaved) {
      updated = savedJobs.filter((j) => j.id !== job.id);
    } else {
      updated = [...savedJobs, { ...job, needsSync: false }];
    }

    // Optimistic update
    setSavedJobs(updated);
    void saveSavedJobs(updated);

    // Backend sync
    const token = await secureStorage.getItemAsync('ff_auth_token_v1');
    if (!token && !anonSessionId) return;

    try {
        await savedApi.toggle(job.id, job);
    } catch (err) {
        // Silently fail and buffer if offline or cold start
        console.log('[Saved] Backend sync failed, buffering locally...', err);
        
        // Mark as needsSync in local state if we just added it
        if (!isAlreadySaved) {
            setSavedJobs(prev => prev.map(j => j.id === job.id ? { ...j, needsSync: true } : j));
        }
        
        await enqueueOfflineSaveToggle(job.id, ownerId);
    }
  };

  const isSaved = (jobId: string) => savedJobs.some((j) => j.id === jobId);

  return (
    <SavedContext.Provider value={{ savedJobs, toggleSave, isSaved, hasPendingSync, syncSavedJobs }}>
      {children}
    </SavedContext.Provider>
  );
};


export const useSaved = () => {
  const context = useContext(SavedContext);
  if (!context) {
    throw new Error('useSaved must be used within a SavedProvider');
  }
  return context;
};

