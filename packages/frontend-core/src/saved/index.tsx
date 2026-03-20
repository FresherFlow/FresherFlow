import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Opportunity } from '@fresherflow/types';
import { readSavedJobs, saveSavedJobs } from '../offline';

interface SavedContextType {
  savedJobs: Opportunity[];
  toggleSave: (job: Opportunity) => void;
  isSaved: (jobId: string) => boolean;
}

const SavedContext = createContext<SavedContextType | undefined>(undefined);

export const SavedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedJobs, setSavedJobs] = useState<Opportunity[]>([]);

  useEffect(() => {
    const bootstrap = async () => {
      const cached = await readSavedJobs();
      setSavedJobs(cached);
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
    setSavedJobs(updated);
    void saveSavedJobs(updated);
  };

  const isSaved = (jobId: string) => savedJobs.some((j) => j.id === jobId);

  return (
    <SavedContext.Provider value={{ savedJobs, toggleSave, isSaved }}>
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
