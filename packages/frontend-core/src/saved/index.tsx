import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Opportunity, OpportunityListResponse } from '@fresherflow/types';
import { readSavedJobs, saveSavedJobs } from '../offline';

import { savedApi } from '@fresherflow/api-client';

interface SavedContextType {
  savedJobs: Opportunity[];
  toggleSave: (job: Opportunity) => void;
  isSaved: (jobId: string) => boolean;
  syncSavedJobs: () => Promise<void>;
}

const SavedContext = createContext<SavedContextType | undefined>(undefined);

export const SavedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedJobs, setSavedJobs] = useState<Opportunity[]>([]);

  const syncSavedJobs = async () => {
    try {
      const response = await savedApi.list() as OpportunityListResponse;
      if (response && response.opportunities) {
        setSavedJobs(response.opportunities);
        void saveSavedJobs(response.opportunities);
      }
    } catch {
      // User likely logged out or offline, silently ignore
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const cached = await readSavedJobs();
      setSavedJobs(cached);
      // Attempt backend sync in background
      void syncSavedJobs();
    };
    void bootstrap();
  }, []);

  const toggleSave = (job: Opportunity) => {
    let updated: Opportunity[];
    const isAlreadySaved = savedJobs.some((j) => j.id === job.id);

    if (isAlreadySaved) {
      updated = savedJobs.filter((j) => j.id !== job.id);
    } else {
      updated = [...savedJobs, job];
    }
    
    // Optimistic update
    setSavedJobs(updated);
    void saveSavedJobs(updated);

    // Backend sync
    savedApi.toggle(job.id).catch(() => {
        // Silently fail if offline or guest
    });
  };

  const isSaved = (jobId: string) => savedJobs.some((j) => j.id === jobId);

  return (
    <SavedContext.Provider value={{ savedJobs, toggleSave, isSaved, syncSavedJobs }}>
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
