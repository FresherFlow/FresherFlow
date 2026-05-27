import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Opportunity } from '@fresherflow/types';
import { 
  readSavedJobs, 
  saveSavedJobs, 
  readNativeFeedCache, 
  readDetailCache, 
  saveDetailCache 
} from '../offline';

interface SavedContextType {
  savedJobs: (Opportunity & { needsSync?: boolean })[];
  toggleSave: (job: Opportunity) => void;
  isSaved: (jobId: string) => boolean;
  hasPendingSync: boolean;
  syncSavedJobs: () => Promise<void>;
}

const SavedContext = createContext<SavedContextType | undefined>(undefined);

let databaseInstance: any;

function getDb(databaseUrl?: string) {
  if (databaseInstance !== undefined) return databaseInstance;
  if (!databaseUrl) return null;
  try {
    const firebase = require('@react-native-firebase/app').default;
    require('@react-native-firebase/database');
    databaseInstance = firebase.app().database(databaseUrl);
  } catch (error) {
    console.warn('[SavedProvider] Firebase Database unavailable:', error);
    databaseInstance = null;
  }
  return databaseInstance;
}

export const SavedProvider: React.FC<{ 
  children: React.ReactNode,
  userId?: string,
  anonSessionId?: string | null,
  firebaseDatabaseUrl?: string
}> = ({ children, userId, anonSessionId, firebaseDatabaseUrl }) => {
  const [savedJobs, setSavedJobs] = useState<(Opportunity & { needsSync?: boolean })[]>([]);
  const [hasPendingSync, setHasPendingSync] = useState(false);

  const syncSavedJobs = async () => {
    if (!userId || !firebaseDatabaseUrl) return;
    try {
      const db = getDb(firebaseDatabaseUrl);
      if (!db) return;

      const ref = db.ref(`/users/${userId}/savedJobs`);
      const snapshot = await ref.once('value');
      const savedIds = snapshot.val() as Record<string, boolean> | string[] | null;

      let ids: string[] = [];
      if (Array.isArray(savedIds)) {
        ids = savedIds.filter(Boolean);
      } else if (savedIds && typeof savedIds === 'object') {
        ids = Object.keys(savedIds).filter(key => savedIds[key]);
      }

      // Reconstruct full Opportunity objects from local feed cache/CDN JSON
      const feedCache = await readNativeFeedCache();
      const allJobs: Opportunity[] = feedCache?.items || [];

      const updatedJobs: Opportunity[] = [];
      for (const id of ids) {
        const found = allJobs.find((j: Opportunity) => j.id === id);
        if (found) {
          updatedJobs.push(found);
        } else {
          const cachedDetail = await readDetailCache(id);
          if (cachedDetail) {
            updatedJobs.push(cachedDetail);
          } else {
            updatedJobs.push({ id, title: 'Saved Job', companyName: 'Details loading...', expiresAt: '' } as any);
          }
        }
      }

      setSavedJobs(updatedJobs);
      void saveSavedJobs(updatedJobs);
      setHasPendingSync(false);
    } catch (err) {
      console.warn('[Saved] Firebase sync failed:', err);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const cached = await readSavedJobs();
      setSavedJobs(cached);
      void syncSavedJobs();
    };
    void bootstrap();
  }, [userId, firebaseDatabaseUrl]);

  const toggleSave = async (job: Opportunity) => {
    setSavedJobs((prev) => {
      let updated: (Opportunity & { needsSync?: boolean })[];
      const isAlreadySaved = prev.some((j) => j.id === job.id);

      if (isAlreadySaved) {
        updated = prev.filter((j) => j.id !== job.id);
      } else {
        updated = [...prev, { ...job, needsSync: false }];
        void saveDetailCache(job);
      }

      void saveSavedJobs(updated);

      if (userId && firebaseDatabaseUrl) {
        const db = getDb(firebaseDatabaseUrl);
        if (db) {
          const ref = db.ref(`/users/${userId}/savedJobs`);
          const map: Record<string, boolean> = {};
          updated.forEach(j => {
            map[j.id] = true;
          });
          ref.set(map).catch((err: any) => {
            console.warn('[Saved] Firebase save failed:', err);
          });
        }
      }

      return updated;
    });
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


