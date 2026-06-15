import React, { createContext, useContext, useState, useEffect } from 'react';
import { OpportunityType, ResourceItemStatus, ResourceSector, type Opportunity, type SharedResource } from '@fresherflow/types';
import { 
  readSavedJobs, 
  saveSavedJobs, 
  readNativeFeedCache, 
  readDetailCache, 
  saveDetailCache,
  saveSavedResources,
  readSavedResources
} from '../offline';

interface SavedContextType {
  savedJobs: (Opportunity & { needsSync?: boolean })[];
  savedResources: SharedResource[];
  toggleSave: (job: Opportunity) => void;
  toggleSaveResource: (res: SharedResource) => void;
  isSaved: (jobId: string) => boolean;
  isSavedResource: (id: string) => boolean;
  hasPendingSync: boolean;
  syncSavedJobs: () => Promise<void>;
  syncSavedResources: () => Promise<void>;
}

const SavedContext = createContext<SavedContextType | undefined>(undefined);

interface FirebaseDatabase {
  ref(path: string): {
    once(event: string): Promise<{ val(): unknown }>;
    set(value: unknown): Promise<void>;
  };
}

let databaseInstance: FirebaseDatabase | null | undefined = undefined;

function getDb(databaseUrl?: string): FirebaseDatabase | null {
  if (databaseInstance !== undefined) return databaseInstance;
  if (!databaseUrl) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const firebase = require('@react-native-firebase/app').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-firebase/database');
    databaseInstance = firebase.app().database(databaseUrl) as FirebaseDatabase;
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
  firebaseDatabaseUrl?: string,
  feedItems?: Opportunity[]
}> = ({ children, userId, firebaseDatabaseUrl, feedItems }) => {
  const [savedJobs, setSavedJobs] = useState<(Opportunity & { needsSync?: boolean })[]>([]);
  const [savedResources, setSavedResources] = useState<SharedResource[]>([]);
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
      const allJobs: Opportunity[] = feedItems || [];
      if (allJobs.length === 0) {
        const feedCache = await readNativeFeedCache();
        if (feedCache?.items) {
          allJobs.push(...feedCache.items);
        }
      }

      const currentSaved = await readSavedJobs();
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
            const existing = currentSaved.find((j) => j.id === id);
            if (existing && existing.title && existing.title !== 'Saved Job') {
              updatedJobs.push(existing);
            } else {
              updatedJobs.push({
                id,
                title: 'Saved Job',
                company: 'Details loading...',
                type: OpportunityType.JOB,
                locations: ['Remote'],
                expiresAt: '',
              } as unknown as Opportunity);
            }
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

  const syncSavedResources = async () => {
    if (!userId || !firebaseDatabaseUrl) return;
    try {
      const db = getDb(firebaseDatabaseUrl);
      if (!db) return;

      const ref = db.ref(`/users/${userId}/savedResources`);
      const snapshot = await ref.once('value');
      const savedIds = snapshot.val() as Record<string, boolean> | string[] | null;

      let ids: string[] = [];
      if (Array.isArray(savedIds)) {
        ids = savedIds.filter(Boolean);
      } else if (savedIds && typeof savedIds === 'object') {
        ids = Object.keys(savedIds).filter(key => savedIds[key]);
      }

      const currentSaved = await readSavedResources() || [];
      const updatedResources: SharedResource[] = [];
      for (const id of ids) {
        const existing = currentSaved.find((r: SharedResource) => r.id === id);
        if (existing && existing.title && existing.title !== 'Saved Resource') {
          updatedResources.push(existing);
        } else {
          updatedResources.push({
            id,
            title: 'Saved Resource',
            description: '',
            company: null,
            skills: [],
            tags: [],
            status: ResourceItemStatus.APPROVED,
            sector: ResourceSector.PRIVATE,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            items: []
          });
        }
      }

      setSavedResources(updatedResources);
      void saveSavedResources(updatedResources);
    } catch (err) {
      console.warn('[Saved] Firebase resources sync failed:', err);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const cached = await readSavedJobs();
      setSavedJobs(cached);
      
      const cachedResources = await readSavedResources();
      setSavedResources(cachedResources);
      
      void syncSavedJobs();
      void syncSavedResources();
    };
    void bootstrap();
  }, [userId, firebaseDatabaseUrl, feedItems]);

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
          ref.set(map).catch((err: unknown) => {
            console.warn('[Saved] Firebase save failed:', err);
          });
        }
      }

      return updated;
    });
  };

  const isSaved = (jobId: string) => savedJobs.some((j) => j.id === jobId);

  const toggleSaveResource = async (res: SharedResource) => {
    setSavedResources((prev) => {
      let updated: SharedResource[];
      const isAlreadySaved = prev.some((r) => r.id === res.id);

      if (isAlreadySaved) {
        updated = prev.filter((r) => r.id !== res.id);
      } else {
        updated = [...prev, res];
      }

      void saveSavedResources(updated);
      
      // We keep Firebase simple and just save the map under savedResources
      if (userId && firebaseDatabaseUrl) {
        const db = getDb(firebaseDatabaseUrl);
        if (db) {
          const ref = db.ref(`/users/${userId}/savedResources`);
          const map: Record<string, boolean> = {};
          updated.forEach(r => {
            map[r.id] = true;
          });
          ref.set(map).catch(() => {});
        }
      }

      return updated;
    });
  };

  const isSavedResource = (id: string) => savedResources.some((r) => r.id === id);

  return (
    <SavedContext.Provider value={{ savedJobs, savedResources, toggleSave, toggleSaveResource, isSaved, isSavedResource, hasPendingSync, syncSavedJobs, syncSavedResources }}>
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


