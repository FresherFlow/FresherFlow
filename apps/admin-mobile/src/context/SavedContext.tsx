import React, { createContext, useContext, useState, useEffect } from 'react';
import { Opportunity } from '@fresherflow/types';
import { readSavedJobs, saveSavedJobs } from '../lib/offlineCache';

// Using shared Opportunity type
type Job = Opportunity;

interface SavedContextType {
  savedJobs: Job[];
  toggleSave: (job: Job) => void;
  isSaved: (jobId: string) => boolean;
}

const SavedContext = createContext<SavedContextType | undefined>(undefined);

export const SavedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);

  useEffect(() => {
    const bootstrap = async () => {
      const cached = await readSavedJobs();
      setSavedJobs(cached);
    };
    void bootstrap();
  }, []);

  const toggleSave = (job: Job) => {
    let updated: Job[];
    const isAlreadySaved = savedJobs.some((j: Job) => j.id === job.id);

    if (isAlreadySaved) {
      updated = savedJobs.filter((j: Job) => j.id !== job.id);
    } else {
      updated = [...savedJobs, job];
    }
    setSavedJobs(updated);
    void saveSavedJobs(updated);
  };

  const isSaved = (jobId: string) => savedJobs.some((j: Job) => j.id === jobId);

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
